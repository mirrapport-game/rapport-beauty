ALTER TABLE public.game_sessions
  ADD COLUMN category_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN mode text NOT NULL DEFAULT 'classic' CHECK (mode IN ('classic','group','flipped','blind_skill','role_swap','time_pressure')),
  ADD COLUMN max_participants int NOT NULL DEFAULT 20 CHECK (max_participants BETWEEN 1 AND 20),
  ADD COLUMN stage_durations jsonb NOT NULL DEFAULT '{"assign_cards":60,"first_play":180,"feedback":120,"second_play":180}'::jsonb,
  ADD COLUMN started_at timestamptz,
  ADD COLUMN finished_at timestamptz;

ALTER TABLE public.session_participants
  ADD COLUMN status text NOT NULL DEFAULT 'joined' CHECK (status IN ('joined','has_cards','first_playing','gave_feedback','skill_opened','second_playing','solution_opened','done'));

CREATE TABLE public.card_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.session_participants(id) ON DELETE CASCADE,
  turn_no int NOT NULL DEFAULT 0,
  card_id text NOT NULL REFERENCES public.cards(id),
  card_type text NOT NULL CHECK (card_type IN ('role','situation','skill','solution')),
  revealed boolean NOT NULL DEFAULT false,
  revealed_at timestamptz,
  revealed_by uuid,
  round_stage text,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX card_assignments_session_idx ON public.card_assignments(session_id, turn_no);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_assignments TO authenticated;
GRANT ALL ON public.card_assignments TO service_role;
ALTER TABLE public.card_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assign read" ON public.card_assignments FOR SELECT TO authenticated USING (
  public.is_session_leader(session_id) OR public.has_role(auth.uid(),'admin')
  OR ((card_type IN ('role','situation') OR revealed) AND EXISTS (SELECT 1 FROM public.session_participants p WHERE p.id = participant_id AND p.user_id = auth.uid()))
);
CREATE POLICY "assign leader insert" ON public.card_assignments FOR INSERT TO authenticated WITH CHECK (public.is_session_leader(session_id));
CREATE POLICY "assign leader update" ON public.card_assignments FOR UPDATE TO authenticated USING (public.is_session_leader(session_id));
CREATE POLICY "assign leader delete" ON public.card_assignments FOR DELETE TO authenticated USING (public.is_session_leader(session_id));

CREATE TABLE public.leader_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.session_participants(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leader_notes TO authenticated;
GRANT ALL ON public.leader_notes TO service_role;
ALTER TABLE public.leader_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes leader" ON public.leader_notes FOR ALL TO authenticated
  USING (public.is_session_leader(session_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_session_leader(session_id));

-- Card contents for the caller's visible assignments (players can't read solution cards directly).
CREATE OR REPLACE FUNCTION public.session_cards(_sid uuid, _turn int)
RETURNS TABLE(assignment_id uuid, participant_id uuid, card_type text, revealed boolean, card jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.participant_id, a.card_type, a.revealed, to_jsonb(c) - 'batch_id'
  FROM public.card_assignments a JOIN public.cards c ON c.id = a.card_id
  WHERE a.session_id = _sid AND a.turn_no = _turn
    AND (public.is_session_leader(_sid) OR public.has_role(auth.uid(),'admin')
      OR ((a.card_type IN ('role','situation') OR a.revealed)
          AND EXISTS (SELECT 1 FROM public.session_participants p WHERE p.id = a.participant_id AND p.user_id = auth.uid())));
$$;
REVOKE EXECUTE ON FUNCTION public.session_cards(uuid,int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.session_cards(uuid,int) TO authenticated;

-- Participant status follows the leader's stage changes.
CREATE OR REPLACE FUNCTION public.sync_participant_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.current_participant IS NOT NULL AND OLD.current_participant IS DISTINCT FROM NEW.current_participant THEN
    UPDATE public.session_participants SET status = 'done' WHERE id = OLD.current_participant;
  END IF;
  IF NEW.current_participant IS NOT NULL AND (NEW.stage IS DISTINCT FROM OLD.stage OR NEW.current_participant IS DISTINCT FROM OLD.current_participant) THEN
    UPDATE public.session_participants SET status = (ARRAY['has_cards','first_playing','gave_feedback','skill_opened','second_playing','solution_opened','done'])[GREATEST(NEW.stage,1)]
    WHERE id = NEW.current_participant;
  END IF;
  IF NEW.status = 'finished' AND OLD.status IS DISTINCT FROM 'finished' THEN NEW.finished_at = now(); END IF;
  IF NEW.turn_no > 0 AND NEW.started_at IS NULL THEN NEW.started_at = now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER game_sessions_status BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION public.sync_participant_status();

-- Enforce participant limit and block joining finished sessions.
CREATE OR REPLACE FUNCTION public.check_join_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g record;
BEGIN
  SELECT max_participants, status INTO g FROM public.game_sessions WHERE id = NEW.session_id;
  IF g.status = 'finished' THEN RAISE EXCEPTION 'session finished'; END IF;
  IF (SELECT count(*) FROM public.session_participants WHERE session_id = NEW.session_id) >= g.max_participants THEN
    RAISE EXCEPTION 'session full';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER session_participants_limit BEFORE INSERT ON public.session_participants FOR EACH ROW EXECUTE FUNCTION public.check_join_limit();

-- Participant scenarios become library cards (solution stays hidden from players by cards RLS).
CREATE OR REPLACE FUNCTION public.user_scenario_to_cards() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u record; cat text; k text;
BEGIN
  SELECT * INTO u FROM public.user_scenarios WHERE id = NEW.scenario_id;
  SELECT id INTO cat FROM public.categories WHERE rubric_no = u.rubric_no LIMIT 1;
  k := replace(u.id::text, '-', '');
  INSERT INTO public.cards (id,type,category_id,direction_id,scenario_id,title,description,opening_line,dialogue,level,card_no,batch_id)
  VALUES ('sit_u_'||k,'situation',cat,cat,'scn_u_'||k,u.title,u.situation,u.dialogue->0->>'line',u.dialogue,1,u.id::text,'participants')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.cards (id,type,category_id,direction_id,scenario_id,title,task,example_dialogue,steps,criteria,card_no,batch_id)
  VALUES ('sol_u_'||k,'solution',cat,cat,'scn_u_'||k,u.title,NEW.task,NEW.solution,'[]','[]',u.id::text,'participants')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.scenarios (id,category_id,direction_id,title,level,situation_id,solution_id,skill_ids,batch_id)
  VALUES ('scn_u_'||k,cat,cat,u.title,1,'sit_u_'||k,'sol_u_'||k,'[]','participants')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER user_scenario_solutions_cards AFTER INSERT ON public.user_scenario_solutions FOR EACH ROW EXECUTE FUNCTION public.user_scenario_to_cards();

CREATE OR REPLACE FUNCTION public.user_scenario_hide_cards() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.cards SET is_active = false WHERE card_no = OLD.id::text AND batch_id = 'participants';
  RETURN OLD;
END $$;
CREATE TRIGGER user_scenarios_hide BEFORE DELETE ON public.user_scenarios FOR EACH ROW EXECUTE FUNCTION public.user_scenario_hide_cards();

ALTER PUBLICATION supabase_realtime ADD TABLE public.card_assignments;