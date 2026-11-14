-- Columns added in the previous change were not readable (game_sessions uses column-level grants).
ALTER TABLE public.game_sessions ADD COLUMN feedback_anonymous boolean NOT NULL DEFAULT false;
GRANT SELECT (category_ids, mode, max_participants, stage_durations, started_at, finished_at, feedback_anonymous) ON public.game_sessions TO authenticated;

ALTER TABLE public.feedback
  ADD COLUMN from_role text NOT NULL DEFAULT 'participant' CHECK (from_role IN ('participant','leader')),
  ADD COLUMN scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN overall_rating int CHECK (overall_rating BETWEEN 1 AND 5);

CREATE POLICY "feedback admin read" ON public.feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sessions admin read" ON public.game_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "participants admin read" ON public.session_participants FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.session_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.session_participants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  card_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores_avg jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_avg numeric(3,2),
  feedback_count int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  UNIQUE (session_id, participant_id)
);
GRANT SELECT ON public.session_results TO authenticated;
GRANT ALL ON public.session_results TO service_role;
ALTER TABLE public.session_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results read" ON public.session_results FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_session_leader(session_id) OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.skill_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  skill_id text NOT NULL REFERENCES public.cards(id),
  category_id text REFERENCES public.categories(id),
  sessions_count int NOT NULL DEFAULT 0,
  avg_score numeric(3,2) NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_id)
);
GRANT SELECT ON public.skill_progress TO authenticated;
GRANT ALL ON public.skill_progress TO service_role;
ALTER TABLE public.skill_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress read" ON public.skill_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.achievements (id text PRIMARY KEY, title text NOT NULL, description text, icon text NOT NULL DEFAULT '🏅', condition jsonb NOT NULL DEFAULT '{}'::jsonb);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements read" ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "achievements admin" ON public.achievements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.achievements (id,title,description,icon,condition) VALUES
 ('first_session','Первый шаг','Сыграть первую сессию','👣','{"type":"sessions","min":1}'),
 ('five_sessions','Опытный игрок','Сыграть 5 сессий','🎯','{"type":"sessions","min":5}'),
 ('ten_sessions','Мастер коммуникации','Сыграть 10 сессий','🏆','{"type":"sessions","min":10}'),
 ('perfect_score','Идеальный ход','Получить 5 по всем критериям','⭐','{"type":"perfect"}'),
 ('streak_7','Неделя в игре','Играть 7 дней подряд','🔥','{"type":"streak","min":7}'),
 ('all_categories','Универсал','Сыграть во всех рубриках','🌐','{"type":"all_categories"}'),
 ('leader_first','Первый стол','Провести первую сессию ведущим','🎤','{"type":"led","min":1}');

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user achievements read" ON public.user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Feedback a participant received; names hidden when the leader chose anonymous feedback.
CREATE OR REPLACE FUNCTION public.my_feedback(_sid uuid)
RETURNS TABLE(id uuid, turn_no int, from_name text, from_role text, scores jsonb, overall_rating int, good text, improve text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.turn_no,
    CASE WHEN g.feedback_anonymous AND f.from_role <> 'leader' THEN NULL ELSE f.from_name END,
    f.from_role, f.scores, f.overall_rating, f.good, f.improve, f.created_at
  FROM public.feedback f
  JOIN public.game_sessions g ON g.id = f.session_id
  JOIN public.session_participants p ON p.id = f.to_participant
  WHERE f.session_id = _sid AND p.user_id = auth.uid()
  ORDER BY f.created_at;
$$;
REVOKE EXECUTE ON FUNCTION public.my_feedback(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_feedback(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.award_achievements(_uid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; led int; streak int; perfect boolean; allc boolean;
BEGIN
  SELECT count(*) INTO n FROM session_results WHERE user_id = _uid AND completed;
  SELECT count(*) INTO led FROM game_sessions WHERE leader_id = _uid AND status = 'finished';
  SELECT EXISTS (SELECT 1 FROM feedback f JOIN session_participants p ON p.id = f.to_participant
    WHERE p.user_id = _uid AND f.scores <> '{}'::jsonb
      AND NOT EXISTS (SELECT 1 FROM jsonb_each_text(f.scores) e WHERE e.value::int < 5)) INTO perfect;
  WITH d AS (SELECT DISTINCT (joined_at AT TIME ZONE 'Europe/Moscow')::date AS day FROM session_participants WHERE user_id = _uid),
       g AS (SELECT day, day - (row_number() OVER (ORDER BY day))::int AS grp FROM d)
  SELECT COALESCE(max(cnt),0) INTO streak FROM (SELECT count(*) cnt FROM g GROUP BY grp) x;
  SELECT NOT EXISTS (SELECT 1 FROM categories c WHERE c.is_active AND NOT EXISTS (
    SELECT 1 FROM card_assignments a JOIN session_participants p ON p.id = a.participant_id JOIN cards k ON k.id = a.card_id
    WHERE p.user_id = _uid AND a.card_type = 'situation' AND k.category_id = c.id)) INTO allc;

  INSERT INTO user_achievements (user_id, achievement_id)
  SELECT _uid, a.id FROM achievements a WHERE
    (a.condition->>'type' = 'sessions' AND n >= COALESCE((a.condition->>'min')::int,1)) OR
    (a.condition->>'type' = 'led' AND led >= COALESCE((a.condition->>'min')::int,1)) OR
    (a.condition->>'type' = 'streak' AND streak >= COALESCE((a.condition->>'min')::int,7)) OR
    (a.condition->>'type' = 'perfect' AND perfect) OR
    (a.condition->>'type' = 'all_categories' AND allc AND n > 0)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.award_achievements(uuid) FROM anon, public, authenticated;

-- On session finish: results per participant, skill progress, achievements.
CREATE OR REPLACE FUNCTION public.finalize_session() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; avgs jsonb; ov numeric; cnt int;
BEGIN
  IF NEW.status <> 'finished' OR OLD.status = 'finished' THEN RETURN NEW; END IF;
  FOR p IN SELECT * FROM session_participants WHERE session_id = NEW.id LOOP
    SELECT COALESCE(jsonb_object_agg(k, a), '{}'::jsonb) INTO avgs FROM (
      SELECT e.key k, round(avg(e.value::numeric), 2) a
      FROM feedback f, jsonb_each_text(f.scores) e WHERE f.to_participant = p.id GROUP BY e.key) s;
    SELECT round(avg(overall_rating)::numeric, 2), count(*) INTO ov, cnt FROM feedback WHERE to_participant = p.id;
    INSERT INTO session_results (session_id, participant_id, user_id, card_ids, scores_avg, overall_avg, feedback_count, completed, completed_at)
    VALUES (NEW.id, p.id, p.user_id,
      COALESCE((SELECT jsonb_agg(card_id) FROM card_assignments WHERE participant_id = p.id), '[]'::jsonb),
      avgs, ov, cnt, EXISTS (SELECT 1 FROM card_assignments WHERE participant_id = p.id), now())
    ON CONFLICT (session_id, participant_id) DO UPDATE SET card_ids = EXCLUDED.card_ids, scores_avg = EXCLUDED.scores_avg,
      overall_avg = EXCLUDED.overall_avg, feedback_count = EXCLUDED.feedback_count, completed = EXCLUDED.completed, completed_at = now();

    INSERT INTO skill_progress AS sp (user_id, skill_id, category_id, sessions_count, avg_score, last_used_at, updated_at)
    SELECT p.user_id, a.card_id, (SELECT k.category_id FROM card_assignments s JOIN cards k ON k.id = s.card_id
        WHERE s.participant_id = p.id AND s.turn_no = a.turn_no AND s.card_type = 'situation' LIMIT 1),
      1, COALESCE(ov, 0), now(), now()
    FROM (SELECT DISTINCT ON (card_id) card_id, turn_no FROM card_assignments WHERE participant_id = p.id AND card_type = 'skill') a
    ON CONFLICT (user_id, skill_id) DO UPDATE SET
      avg_score = CASE WHEN EXCLUDED.avg_score = 0 THEN sp.avg_score
        ELSE round((sp.avg_score * sp.sessions_count + EXCLUDED.avg_score) / (sp.sessions_count + 1), 2) END,
      sessions_count = sp.sessions_count + 1, last_used_at = now(), updated_at = now();

    PERFORM award_achievements(p.user_id);
  END LOOP;
  PERFORM award_achievements(NEW.leader_id);
  RETURN NEW;
END $$;
CREATE TRIGGER game_sessions_finalize AFTER UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION public.finalize_session();