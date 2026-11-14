ALTER TABLE public.profiles ADD COLUMN prof_role text, ADD COLUMN play_scope text NOT NULL DEFAULT 'all' CHECK (play_scope IN ('own','all'));
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE first_user boolean;
BEGIN
  INSERT INTO public.profiles(id, display_name, prof_role, play_scope)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), 'Гость'),
    nullif(new.raw_user_meta_data->>'prof_role',''),
    CASE WHEN new.raw_user_meta_data->>'play_scope' = 'own' THEN 'own' ELSE 'all' END)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (new.id, 'player') ON CONFLICT DO NOTHING;
  IF coalesce(new.is_anonymous, false) THEN RETURN new; END IF;
  SELECT NOT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO first_user;
  IF first_user THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (new.id, 'admin'), (new.id, 'leader') ON CONFLICT DO NOTHING;
  END IF;
  RETURN new;
END $$;