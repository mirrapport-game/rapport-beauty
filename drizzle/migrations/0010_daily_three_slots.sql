CREATE TABLE public.daily_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.daily_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  slot text NOT NULL CHECK (slot IN ('morning','day','evening')),
  task_id text REFERENCES public.daily_tasks(id),
  answer_text text,
  feedback_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, slot)
);
GRANT SELECT ON public.daily_answers TO authenticated;
GRANT ALL ON public.daily_answers TO service_role;
ALTER TABLE public.daily_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "da own read" ON public.daily_answers FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.choose_daily_role(_role text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); tz text; d date; cid uuid; prev record; streak int := 1;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM daily_roles WHERE id = _role AND is_active) THEN RAISE EXCEPTION 'role not found'; END IF;
  INSERT INTO user_daily_preferences(user_id, enabled) VALUES (uid, true)
    ON CONFLICT (user_id) DO UPDATE SET enabled = true;
  SELECT timezone INTO tz FROM user_daily_preferences WHERE user_id = uid;
  d := (now() AT TIME ZONE coalesce(tz,'Europe/Moscow'))::date;
  SELECT id INTO cid FROM daily_cards WHERE user_id = uid AND issued_date = d;
  IF FOUND THEN
    IF NOT EXISTS (SELECT 1 FROM daily_answers WHERE card_id = cid) THEN
      UPDATE daily_cards SET role_id = _role, task_id = (SELECT id FROM daily_tasks WHERE role_id = _role AND type = 'open' LIMIT 1) WHERE id = cid;
    END IF;
    RETURN cid;
  END IF;
  SELECT issued_date, streak_day, status INTO prev FROM daily_cards WHERE user_id = uid ORDER BY issued_date DESC LIMIT 1;
  IF FOUND AND prev.issued_date = d - 1 AND prev.status = 'answered' THEN streak := prev.streak_day + 1; END IF;
  INSERT INTO daily_cards(user_id, role_id, task_id, issued_date, streak_day)
    VALUES (uid, _role, (SELECT id FROM daily_tasks WHERE role_id = _role AND type = 'open' LIMIT 1), d, streak) RETURNING id INTO cid;
  RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.choose_daily_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.choose_daily_role(text) TO authenticated;