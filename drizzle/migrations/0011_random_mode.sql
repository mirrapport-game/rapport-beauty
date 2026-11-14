ALTER TABLE public.game_sessions DROP CONSTRAINT IF EXISTS game_sessions_mode_check;
ALTER TABLE public.game_sessions ADD CONSTRAINT game_sessions_mode_check CHECK (mode IN ('classic','group','flipped','blind_skill','role_swap','time_pressure','random'));
ALTER TABLE public.card_assignments ADD COLUMN play_mode text;

CREATE OR REPLACE FUNCTION public.assign_random_mode() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.card_type = 'solution' AND NEW.play_mode IS NULL
     AND (SELECT mode FROM public.game_sessions WHERE id = NEW.session_id) = 'random' THEN
    NEW.play_mode := (ARRAY['classic','flipped','blind_skill','role_swap','time_pressure'])[1 + floor(random()*5)::int];
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER card_assignments_random_mode BEFORE INSERT ON public.card_assignments
FOR EACH ROW EXECUTE FUNCTION public.assign_random_mode();

CREATE OR REPLACE FUNCTION public.session_cards(_sid uuid, _turn int)
RETURNS TABLE(assignment_id uuid, participant_id uuid, card_type text, revealed boolean, card jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.participant_id, a.card_type, a.revealed,
    (to_jsonb(c) - 'batch_id') || jsonb_build_object('play_mode', a.play_mode)
  FROM public.card_assignments a JOIN public.cards c ON c.id = a.card_id
  WHERE a.session_id = _sid AND a.turn_no = _turn
    AND (public.is_session_leader(_sid) OR public.has_role(auth.uid(),'admin')
      OR ((a.card_type IN ('role','situation') OR a.revealed)
          AND EXISTS (SELECT 1 FROM public.session_participants p WHERE p.id = a.participant_id AND p.user_id = auth.uid())));
$$;