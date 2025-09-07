-- Update the toggle_session_visibility function to better handle gym owners with multiple gyms
CREATE OR REPLACE FUNCTION public.toggle_session_visibility(_session_id uuid, _new_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _session_course_id uuid;
  _session_gym_id uuid;
  _instructor_id uuid;
  _actor_owned_gyms uuid[];
BEGIN
  -- Verify user is authenticated
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Verify new status is valid
  IF _new_status NOT IN ('scheduled', 'hidden') THEN
    RAISE EXCEPTION 'Invalid status. Only scheduled and hidden are allowed.';
  END IF;

  -- Get session details
  SELECT cs.course_id, c.gym_id, c.instructor_id
  INTO _session_course_id, _session_gym_id, _instructor_id
  FROM public.course_sessions cs
  JOIN public.courses c ON cs.course_id = c.id
  WHERE cs.id = _session_id;

  IF _session_course_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Get owned gyms for the actor
  SELECT get_user_owned_gyms(_actor) INTO _actor_owned_gyms;

  -- Check permissions with improved logic
  IF NOT (
    -- Admin can manage all sessions
    has_role(_actor, 'admin'::app_role) OR
    -- Gym owner can manage sessions in their owned gyms
    (has_role(_actor, 'gym_owner'::app_role) AND _session_gym_id = ANY(_actor_owned_gyms)) OR
    -- Super instructor can manage sessions in their gyms
    (has_role(_actor, 'instructor'::app_role) AND instructor_has_owner_privileges_for_gym(_actor, _session_gym_id)) OR
    -- Regular instructor can manage their own sessions
    (has_role(_actor, 'instructor'::app_role) AND _instructor_id IN (
      SELECT i.id FROM public.instructors i WHERE i.user_id = _actor
    ))
  ) THEN
    RAISE EXCEPTION 'Permission denied: Cannot modify sessions for gym %', _session_gym_id;
  END IF;

  -- Update session status
  UPDATE public.course_sessions 
  SET status = _new_status, updated_at = now()
  WHERE id = _session_id;

  RETURN true;
END;
$function$;