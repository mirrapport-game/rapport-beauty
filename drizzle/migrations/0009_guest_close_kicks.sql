CREATE OR REPLACE FUNCTION public.guest_invite_revoke() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF (TG_OP = 'DELETE' OR NOT NEW.is_open) AND r.participant_id IS NOT NULL THEN
    UPDATE game_sessions SET current_participant = NULL, stage = 0, current_card_id = NULL, timer_started_at = NULL
      WHERE id = r.session_id AND current_participant = r.participant_id;
    DELETE FROM session_participants WHERE id = r.participant_id;
    IF TG_OP = 'UPDATE' THEN NEW.participant_id := NULL; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guest_invite_revoke_upd BEFORE UPDATE OF is_open ON public.guest_invites
  FOR EACH ROW WHEN (OLD.is_open AND NOT NEW.is_open) EXECUTE FUNCTION public.guest_invite_revoke();
CREATE TRIGGER guest_invite_revoke_del BEFORE DELETE ON public.guest_invites
  FOR EACH ROW EXECUTE FUNCTION public.guest_invite_revoke();