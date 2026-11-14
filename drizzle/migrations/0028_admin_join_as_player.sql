CREATE OR REPLACE FUNCTION public.admin_join_as_player(_sid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Только для администратора'; END IF;
  IF NOT EXISTS(SELECT 1 FROM game_sessions WHERE id=_sid AND leader_id=auth.uid()) THEN RAISE EXCEPTION 'Не ваша сессия'; END IF;
  SELECT coalesce(nullif(display_name,''),'Админ') INTO n FROM profiles WHERE id=auth.uid();
  INSERT INTO session_participants(session_id,user_id,display_name) VALUES (_sid,auth.uid(),coalesce(n,'Админ')||' (тест)') ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.admin_join_as_player(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_join_as_player(uuid) TO authenticated;