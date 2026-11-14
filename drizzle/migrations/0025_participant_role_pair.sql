ALTER TABLE public.session_participants ADD COLUMN IF NOT EXISTS pair_category_id text REFERENCES public.categories(id);
CREATE OR REPLACE FUNCTION public.choose_my_pair(_sid uuid, _cat text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cats jsonb;
BEGIN
  SELECT category_ids INTO cats FROM game_sessions WHERE id = _sid;
  IF _cat IS NOT NULL AND jsonb_array_length(coalesce(cats,'[]'::jsonb)) > 0 AND NOT cats ? _cat THEN
    RAISE EXCEPTION 'category not in session';
  END IF;
  UPDATE session_participants SET pair_category_id = _cat WHERE session_id = _sid AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'not a participant'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.choose_my_pair(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.choose_my_pair(uuid, text) TO authenticated;