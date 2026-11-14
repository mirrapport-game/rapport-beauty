CREATE OR REPLACE FUNCTION public.admin_restart_my_progress()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'only admin';
  END IF;
  DELETE FROM public.daily_answers WHERE user_id = uid;
  DELETE FROM public.daily_cards WHERE user_id = uid;
  DELETE FROM public.career_ladder_progress WHERE user_id = uid;
  DELETE FROM public.user_daily_preferences WHERE user_id = uid;
  DELETE FROM public.assessment_results WHERE user_id = uid;
END $$;
REVOKE ALL ON FUNCTION public.admin_restart_my_progress() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_restart_my_progress() TO authenticated;