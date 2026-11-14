CREATE TABLE public.daily_roles (id text PRIMARY KEY, title text NOT NULL, category_id text REFERENCES public.categories(id), description text, tags jsonb, is_active boolean NOT NULL DEFAULT true);
CREATE TABLE public.daily_role_context (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), role_id text NOT NULL REFERENCES public.daily_roles(id) ON DELETE CASCADE, who_you_are text, where_you_are text, what_is_happening text, what_you_feel text, what_you_want text, what_you_fear text, what_to_remember text, key_phrase text);
CREATE TABLE public.daily_tasks (id text PRIMARY KEY, role_id text NOT NULL REFERENCES public.daily_roles(id) ON DELETE CASCADE, type text NOT NULL CHECK (type IN ('open','mini_case','roleplay')), question text NOT NULL, criteria jsonb, model_answer text, level int CHECK (level BETWEEN 1 AND 3));
CREATE TABLE public.daily_cards (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, role_id text REFERENCES public.daily_roles(id), task_id text REFERENCES public.daily_tasks(id), issued_date date NOT NULL, issued_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','answered','skipped')), answer_text text, answer_audio_url text, feedback_json jsonb, model_answer_shown boolean NOT NULL DEFAULT false, streak_day int NOT NULL DEFAULT 1, UNIQUE (user_id, issued_date));
CREATE TABLE public.user_daily_preferences (user_id uuid PRIMARY KEY, enabled boolean NOT NULL DEFAULT false, role_ids jsonb, timezone text NOT NULL DEFAULT 'Europe/Moscow', preferred_time time NOT NULL DEFAULT '08:00');
GRANT SELECT ON public.daily_roles, public.daily_role_context TO authenticated;
GRANT SELECT (id, role_id, type, question, criteria, level) ON public.daily_tasks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.daily_roles, public.daily_role_context, public.daily_tasks TO authenticated;
GRANT SELECT ON public.daily_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_daily_preferences TO authenticated;
GRANT ALL ON public.daily_roles, public.daily_role_context, public.daily_tasks, public.daily_cards, public.user_daily_preferences TO service_role;
ALTER TABLE public.daily_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_role_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr read" ON public.daily_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "dr admin" ON public.daily_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "drc read" ON public.daily_role_context FOR SELECT TO authenticated USING (true);
CREATE POLICY "drc admin" ON public.daily_role_context FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "dt read" ON public.daily_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "dt admin" ON public.daily_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "dc own" ON public.daily_cards FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "udp own read" ON public.user_daily_preferences FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "udp own ins" ON public.user_daily_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "udp own upd" ON public.user_daily_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.issue_daily_card_for(_uid uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; d date; cid uuid; r text; n int; t text; prev record; streak int := 1;
BEGIN
  SELECT * INTO p FROM user_daily_preferences WHERE user_id = _uid AND enabled;
  IF NOT FOUND THEN RETURN NULL; END IF;
  d := (now() AT TIME ZONE p.timezone)::date;
  SELECT id INTO cid FROM daily_cards WHERE user_id = _uid AND issued_date = d;
  IF FOUND THEN RETURN cid; END IF;
  SELECT id INTO r FROM daily_roles WHERE is_active AND (p.role_ids IS NULL OR jsonb_array_length(p.role_ids) = 0 OR p.role_ids ? id) ORDER BY random() LIMIT 1;
  IF r IS NULL THEN RETURN NULL; END IF;
  SELECT count(*) INTO n FROM daily_cards WHERE user_id = _uid;
  t := (ARRAY['open','mini_case','roleplay'])[(n % 3) + 1];
  SELECT id INTO t FROM daily_tasks WHERE role_id = r AND type = t;
  SELECT issued_date, streak_day, status INTO prev FROM daily_cards WHERE user_id = _uid ORDER BY issued_date DESC LIMIT 1;
  IF FOUND AND prev.issued_date = d - 1 AND prev.status = 'answered' THEN streak := prev.streak_day + 1; END IF;
  INSERT INTO daily_cards(user_id, role_id, task_id, issued_date, streak_day) VALUES (_uid, r, t, d, streak) RETURNING id INTO cid;
  RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.issue_daily_card_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_daily_card_for(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.issue_my_daily_card() RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT public.issue_daily_card_for(auth.uid()) $$;
REVOKE ALL ON FUNCTION public.issue_my_daily_card() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_my_daily_card() TO authenticated;
CREATE OR REPLACE FUNCTION public.issue_all_daily_cards() RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u record; c int := 0; BEGIN
  FOR u IN SELECT user_id, timezone, preferred_time FROM user_daily_preferences WHERE enabled LOOP
    IF (now() AT TIME ZONE u.timezone)::time >= u.preferred_time THEN
      PERFORM public.issue_daily_card_for(u.user_id); c := c + 1; END IF;
  END LOOP; RETURN c; END $$;
REVOKE ALL ON FUNCTION public.issue_all_daily_cards() FROM PUBLIC, anon, authenticated;