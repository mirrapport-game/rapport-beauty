CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  join_code text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','manager')),
  joined_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_scenarios ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;

GRANT SELECT ON public.clinics TO authenticated;
GRANT SELECT ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinics TO service_role;
GRANT ALL ON public.clinic_members TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_clinic_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.is_clinic_manager(_cid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id=_cid AND user_id=auth.uid() AND role='manager') $$;

CREATE POLICY "clinic visible to members/admin" ON public.clinics FOR SELECT TO authenticated
  USING (id = public.my_clinic_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "members visible in own clinic" ON public.clinic_members FOR SELECT TO authenticated
  USING (clinic_id = public.my_clinic_id() OR public.has_role(auth.uid(),'admin'));

-- admin: create clinic
CREATE OR REPLACE FUNCTION public.create_clinic(_name text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.clinics(name, created_by) VALUES (trim(_name), auth.uid()) RETURNING id INTO _id;
  RETURN _id;
END $$;

-- admin: make a user (by email) the manager of a clinic
CREATE OR REPLACE FUNCTION public.admin_set_clinic_manager(_cid uuid, _email text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email)=lower(trim(_email));
  IF _uid IS NULL THEN RAISE EXCEPTION 'Пользователь с таким email не найден'; END IF;
  INSERT INTO public.clinic_members(clinic_id,user_id,role) VALUES (_cid,_uid,'manager')
    ON CONFLICT (user_id) DO UPDATE SET clinic_id=_cid, role='manager';
  INSERT INTO public.user_roles(user_id,role) VALUES (_uid,'leader') ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_clinic(_cid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.clinics WHERE id=_cid;
END $$;

-- anyone: join by clinic code
CREATE OR REPLACE FUNCTION public.join_clinic(_code text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT id INTO _cid FROM public.clinics WHERE join_code=upper(trim(_code));
  IF _cid IS NULL THEN RAISE EXCEPTION 'Клиника с таким кодом не найдена'; END IF;
  IF EXISTS (SELECT 1 FROM public.clinic_members WHERE user_id=auth.uid() AND role='manager' AND clinic_id<>_cid) THEN
    RAISE EXCEPTION 'Вы руководитель другой клиники'; END IF;
  INSERT INTO public.clinic_members(clinic_id,user_id) VALUES (_cid,auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET clinic_id=_cid
    WHERE public.clinic_members.role='member';
  RETURN _cid;
END $$;

CREATE OR REPLACE FUNCTION public.leave_clinic() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS
$$ DELETE FROM public.clinic_members WHERE user_id=auth.uid() AND role='member' $$;

-- manager actions
CREATE OR REPLACE FUNCTION public.clinic_manage_member(_uid uuid, _action text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _cid uuid := public.my_clinic_id();
BEGIN
  IF _cid IS NULL OR NOT public.is_clinic_manager(_cid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id=_cid AND user_id=_uid) THEN RAISE EXCEPTION 'not a member'; END IF;
  IF _uid = auth.uid() THEN RAISE EXCEPTION 'Нельзя менять себя'; END IF;
  IF _action='grant_leader' THEN INSERT INTO public.user_roles(user_id,role) VALUES (_uid,'leader') ON CONFLICT DO NOTHING;
  ELSIF _action='revoke_leader' THEN DELETE FROM public.user_roles WHERE user_id=_uid AND role='leader';
  ELSIF _action='make_manager' THEN UPDATE public.clinic_members SET role='manager' WHERE user_id=_uid;
    INSERT INTO public.user_roles(user_id,role) VALUES (_uid,'leader') ON CONFLICT DO NOTHING;
  ELSIF _action='make_member' THEN UPDATE public.clinic_members SET role='member' WHERE user_id=_uid;
  ELSIF _action='remove' THEN DELETE FROM public.clinic_members WHERE user_id=_uid;
  ELSE RAISE EXCEPTION 'bad action'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.clinic_new_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _cid uuid := public.my_clinic_id(); _c text := upper(substr(md5(random()::text),1,6));
BEGIN
  IF _cid IS NULL OR NOT public.is_clinic_manager(_cid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.clinics SET join_code=_c WHERE id=_cid; RETURN _c;
END $$;

CREATE OR REPLACE FUNCTION public.clinic_stats(_cid uuid) RETURNS TABLE(user_id uuid, display_name text, email text, member_role text, is_leader boolean, games integer, avg_score numeric, solo_count integer, daily_done integer, scenarios integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT (public.is_clinic_manager(_cid) OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT m.user_id, coalesce(p.display_name,'—'), u.email::text, m.role,
    EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=m.user_id AND r.role='leader'),
    (SELECT count(*)::int FROM public.session_results s WHERE s.user_id=m.user_id),
    (SELECT round(avg(s.overall_avg),2) FROM public.session_results s WHERE s.user_id=m.user_id),
    (SELECT count(*)::int FROM public.solo_sessions o WHERE o.user_id=m.user_id),
    (SELECT count(*)::int FROM public.daily_answers d WHERE d.user_id=m.user_id),
    (SELECT count(*)::int FROM public.user_scenarios us WHERE us.author_id=m.user_id)
  FROM public.clinic_members m LEFT JOIN public.profiles p ON p.id=m.user_id LEFT JOIN auth.users u ON u.id=m.user_id
  WHERE m.clinic_id=_cid ORDER BY m.role DESC, p.display_name;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_clinics() RETURNS TABLE(id uuid, name text, join_code text, members integer, managers text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT c.id, c.name, c.join_code,
    (SELECT count(*)::int FROM public.clinic_members m WHERE m.clinic_id=c.id),
    (SELECT string_agg(u.email::text, ', ') FROM public.clinic_members m JOIN auth.users u ON u.id=m.user_id WHERE m.clinic_id=c.id AND m.role='manager')
  FROM public.clinics c ORDER BY c.created_at DESC;
END $$;

-- manager may delete scenarios of their clinic
CREATE POLICY "clinic manager deletes clinic scenarios" ON public.user_scenarios FOR DELETE TO authenticated
  USING (clinic_id IS NOT NULL AND public.is_clinic_manager(clinic_id));
CREATE POLICY "clinic members read clinic scenarios" ON public.user_scenarios FOR SELECT TO authenticated
  USING (clinic_id IS NOT NULL AND clinic_id = public.my_clinic_id());

REVOKE EXECUTE ON FUNCTION public.create_clinic(text), public.admin_set_clinic_manager(uuid,text), public.admin_delete_clinic(uuid), public.join_clinic(text), public.leave_clinic(), public.clinic_manage_member(uuid,text), public.clinic_new_code(), public.clinic_stats(uuid), public.admin_list_clinics() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_clinic(text), public.admin_set_clinic_manager(uuid,text), public.admin_delete_clinic(uuid), public.join_clinic(text), public.leave_clinic(), public.clinic_manage_member(uuid,text), public.clinic_new_code(), public.clinic_stats(uuid), public.admin_list_clinics() TO authenticated;