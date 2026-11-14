DROP POLICY IF EXISTS "scenarios read" ON public.user_scenarios;
CREATE POLICY "scenarios read own or staff" ON public.user_scenarios FOR SELECT TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(),'leader') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "dt read" ON public.daily_tasks;
CREATE POLICY "dt read active roles" ON public.daily_tasks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.daily_roles r WHERE r.id = role_id AND r.is_active));

DROP POLICY IF EXISTS "drc read" ON public.daily_role_context;
CREATE POLICY "drc read active roles" ON public.daily_role_context FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.daily_roles r WHERE r.id = role_id AND r.is_active));