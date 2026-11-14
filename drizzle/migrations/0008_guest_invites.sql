CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_user boolean;
BEGIN
  INSERT INTO public.profiles(id, display_name)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), 'Гость'))
  ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (new.id, 'player') ON CONFLICT DO NOTHING;
  IF coalesce(new.is_anonymous, false) THEN RETURN new; END IF;
  SELECT NOT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO first_user;
  IF first_user THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (new.id, 'admin'), (new.id, 'leader') ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END $$;

CREATE TABLE public.guest_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(9), 'hex'),
  is_open boolean NOT NULL DEFAULT true,
  used_by uuid,
  participant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_invites TO authenticated;
GRANT ALL ON public.guest_invites TO service_role;
ALTER TABLE public.guest_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leader manages guest invites" ON public.guest_invites FOR ALL TO authenticated
  USING (public.is_session_leader(session_id)) WITH CHECK (public.is_session_leader(session_id));

CREATE OR REPLACE FUNCTION public.claim_guest_invite(_token text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g record; pid uuid; st text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO g FROM guest_invites WHERE token = trim(_token);
  IF g.id IS NULL OR NOT g.is_open THEN RAISE EXCEPTION 'Приглашение недействительно или закрыто ведущим'; END IF;
  IF g.used_by IS NOT NULL AND g.used_by <> auth.uid() THEN RAISE EXCEPTION 'Это приглашение уже использовано на другом устройстве'; END IF;
  SELECT status INTO st FROM game_sessions WHERE id = g.session_id;
  IF st = 'finished' THEN RAISE EXCEPTION 'Сессия завершена'; END IF;
  UPDATE profiles SET display_name = g.display_name WHERE id = auth.uid() AND display_name = 'Гость';
  SELECT id INTO pid FROM session_participants WHERE session_id = g.session_id AND user_id = auth.uid();
  IF pid IS NULL THEN
    INSERT INTO session_participants(session_id, user_id, display_name) VALUES (g.session_id, auth.uid(), g.display_name) RETURNING id INTO pid;
  END IF;
  UPDATE guest_invites SET used_by = auth.uid(), participant_id = pid WHERE id = g.id;
  RETURN g.session_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_guest_invite(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_guest_invite(text) TO authenticated;