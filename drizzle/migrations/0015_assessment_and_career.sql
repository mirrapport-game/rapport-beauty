CREATE TABLE public.assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  test_id text NOT NULL DEFAULT 'assessment_v1',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  level text NOT NULL DEFAULT 'beginner',
  completed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.assessment_results TO authenticated;
GRANT ALL ON public.assessment_results TO service_role;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assess read" ON public.assessment_results FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "assess insert" ON public.assessment_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX ON public.assessment_results (user_id, completed_at DESC);

CREATE TABLE public.career_ladder_progress (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  ladder_id text NOT NULL DEFAULT 'career_v1',
  current_step integer NOT NULL DEFAULT 1,
  completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores_by_step jsonb NOT NULL DEFAULT '{}'::jsonb,
  role_mode text NOT NULL DEFAULT 'my_role' CHECK (role_mode IN ('random','my_role','career_ladder')),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.career_ladder_progress TO authenticated;
GRANT ALL ON public.career_ladder_progress TO service_role;
ALTER TABLE public.career_ladder_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ladder read" ON public.career_ladder_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ladder insert" ON public.career_ladder_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ladder update" ON public.career_ladder_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());