CREATE TABLE public.solo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  scenario_id text REFERENCES public.scenarios(id),
  situation_id text REFERENCES public.cards(id),
  role_id text REFERENCES public.cards(id),
  skill_id text REFERENCES public.cards(id),
  solution_id text REFERENCES public.cards(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','finished','abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE TABLE public.solo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solo_session_id uuid NOT NULL REFERENCES public.solo_sessions(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','bot','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.solo_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solo_session_id uuid NOT NULL REFERENCES public.solo_sessions(id) ON DELETE CASCADE,
  scores jsonb, comments_what_worked text, comments_what_to_improve text,
  ai_generated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.solo_messages(solo_session_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.solo_sessions, public.solo_messages, public.solo_feedback TO authenticated;
GRANT ALL ON public.solo_sessions, public.solo_messages, public.solo_feedback TO service_role;
ALTER TABLE public.solo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solo_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo own read" ON public.solo_sessions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "solo own insert" ON public.solo_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'active');
CREATE POLICY "solo msgs read" ON public.solo_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.solo_sessions s WHERE s.id = solo_session_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "solo fb read" ON public.solo_feedback FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.solo_sessions s WHERE s.id = solo_session_id AND (s.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));