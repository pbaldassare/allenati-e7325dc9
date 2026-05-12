
CREATE OR REPLACE FUNCTION public.recalculate_session_available_spots(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_confirmed integer;
  v_new integer;
BEGIN
  SELECT max_participants INTO v_max FROM public.course_sessions WHERE id = p_session_id;
  IF v_max IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_confirmed
  FROM public.bookings
  WHERE session_id = p_session_id AND status = 'confirmed';

  v_new := GREATEST(0, LEAST(v_max, v_max - v_confirmed));

  UPDATE public.course_sessions
  SET available_spots = v_new,
      updated_at = now()
  WHERE id = p_session_id;

  RETURN v_new;
END;
$$;

-- Backfill una tantum: riallinea TUTTE le sessioni
UPDATE public.course_sessions cs
SET available_spots = GREATEST(0, LEAST(cs.max_participants, cs.max_participants - sub.confirmed_count)),
    updated_at = now()
FROM (
  SELECT cs2.id AS session_id,
         COALESCE((
           SELECT count(*) FROM public.bookings b
           WHERE b.session_id = cs2.id AND b.status = 'confirmed'
         ), 0) AS confirmed_count
  FROM public.course_sessions cs2
) sub
WHERE cs.id = sub.session_id
  AND cs.available_spots IS DISTINCT FROM GREATEST(0, LEAST(cs.max_participants, cs.max_participants - sub.confirmed_count));
