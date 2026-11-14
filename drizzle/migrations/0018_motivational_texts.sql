-- Onboarding flag, achievement wording from the motivational copy brief,
-- new achievements (streak_30, career_ladder, mentor) and a clinic streak
-- total for the team card.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Achievement wording from the brief.
UPDATE public.achievements SET title = 'Первый шаг', description = 'Ты сыграл первую сессию. Начало положено!' WHERE id = 'first_session';
UPDATE public.achievements SET title = 'Опытный игрок', description = '5 сессий позади. Ты уже многое умеешь.' WHERE id = 'five_sessions';
UPDATE public.achievements SET title = 'Мастер коммуникации', description = '10 сессий. Ты уверенно справляешься со сложными разговорами.' WHERE id = 'ten_sessions';
UPDATE public.achievements SET title = 'Идеальный ход', description = 'Все 5 по критериям. Ты — пример для коллег.' WHERE id = 'perfect_score';
UPDATE public.achievements SET title = 'Неделя в игре', description = '7 дней подряд. Это уже привычка.' WHERE id = 'streak_7';
UPDATE public.achievements SET title = 'Универсал', description = 'Ты сыграл во всех категориях. Широкий кругозор!' WHERE id = 'all_categories';

INSERT INTO public.achievements (id, title, description, icon, condition) VALUES
  ('streak_30', 'Месяц в игре', '30 дней подряд. Ты — легенда.', '🏅', '{"type":"streak","min":30}'),
  ('career_ladder', 'Карьерная лестница', 'Ты прошёл все 10 ролей — от санитарки до владельца.', '🪜', '{"type":"career_ladder"}'),
  ('mentor', 'Наставник', 'Ты помог коллеге пройти первый тест. Спасибо!', '🤝', '{"type":"mentor"}')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, description = EXCLUDED.description, icon = EXCLUDED.icon, condition = EXCLUDED.condition;

-- award_achievements: same rules plus the two new conditions.
CREATE OR REPLACE FUNCTION public.award_achievements(_uid uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; led int; streak int; perfect boolean; allc boolean; ladder boolean; mentor boolean;
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
  SELECT EXISTS (SELECT 1 FROM career_ladder_progress WHERE user_id = _uid
    AND jsonb_array_length(completed_steps) >= 10) INTO ladder;
  SELECT EXISTS (SELECT 1 FROM clinic_members mine
    JOIN clinic_members other ON other.clinic_id = mine.clinic_id AND other.user_id <> mine.user_id
    WHERE mine.user_id = _uid AND mine.role = 'manager'
      AND EXISTS (SELECT 1 FROM assessment_results ar WHERE ar.user_id = other.user_id)) INTO mentor;

  INSERT INTO user_achievements (user_id, achievement_id)
  SELECT _uid, a.id FROM achievements a WHERE
    (a.condition->>'type' = 'sessions' AND n >= COALESCE((a.condition->>'min')::int,1)) OR
    (a.condition->>'type' = 'led' AND led >= COALESCE((a.condition->>'min')::int,1)) OR
    (a.condition->>'type' = 'streak' AND streak >= COALESCE((a.condition->>'min')::int,7)) OR
    (a.condition->>'type' = 'perfect' AND perfect) OR
    (a.condition->>'type' = 'all_categories' AND allc AND n > 0) OR
    (a.condition->>'type' = 'career_ladder' AND ladder) OR
    (a.condition->>'type' = 'mentor' AND mentor)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
END $$;
REVOKE EXECUTE ON FUNCTION public.award_achievements(uuid) FROM anon, public, authenticated;

-- The ladder is trained in solo mode, so award it as soon as a step is recorded.
CREATE OR REPLACE FUNCTION public.award_on_ladder_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.completed_steps IS DISTINCT FROM OLD.completed_steps THEN
    PERFORM award_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS career_ladder_award ON public.career_ladder_progress;
CREATE TRIGGER career_ladder_award AFTER UPDATE ON public.career_ladder_progress
  FOR EACH ROW EXECUTE FUNCTION public.award_on_ladder_change();

-- A colleague passing the entry test awards their clinic manager «Наставник».
CREATE OR REPLACE FUNCTION public.award_on_member_test() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m uuid;
BEGIN
  FOR m IN SELECT other.user_id FROM clinic_members mine
    JOIN clinic_members other ON other.clinic_id = mine.clinic_id
    WHERE mine.user_id = NEW.user_id AND other.role = 'manager' AND other.user_id <> NEW.user_id
  LOOP
    PERFORM award_achievements(m);
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS assessment_mentor ON public.assessment_results;
CREATE TRIGGER assessment_mentor AFTER INSERT ON public.assessment_results
  FOR EACH ROW EXECUTE FUNCTION public.award_on_member_test();

-- Team card: clinic name, member count and the total streak of its members.
CREATE OR REPLACE FUNCTION public.clinic_streak() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; res jsonb;
BEGIN
  SELECT clinic_id INTO cid FROM clinic_members WHERE user_id = auth.uid() LIMIT 1;
  IF cid IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'name', c.name,
    'members', (SELECT count(*)::int FROM clinic_members WHERE clinic_id = cid),
    'streak_sum', COALESCE((
      WITH d AS (SELECT DISTINCT m.user_id, (p.joined_at AT TIME ZONE 'Europe/Moscow')::date AS day
                 FROM clinic_members m JOIN session_participants p ON p.user_id = m.user_id
                 WHERE m.clinic_id = cid),
           r AS (SELECT user_id, day - (row_number() OVER (PARTITION BY user_id ORDER BY day))::int AS grp FROM d),
           s AS (SELECT user_id, grp, count(*)::int AS cnt FROM r GROUP BY 1, 2),
           u AS (SELECT user_id, max(cnt)::int AS streak FROM s GROUP BY 1)
      SELECT sum(streak)::int FROM u), 0)
  ) INTO res FROM clinics c WHERE c.id = cid;
  RETURN res;
END $$;
REVOKE EXECUTE ON FUNCTION public.clinic_streak() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.clinic_streak() TO authenticated;