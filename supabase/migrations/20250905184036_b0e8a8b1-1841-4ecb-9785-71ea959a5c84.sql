-- Update course_sessions table to support 'hidden' status
-- First check what status values already exist
-- Then update the check constraint to include 'hidden'

-- Remove existing constraint if it exists
ALTER TABLE public.course_sessions DROP CONSTRAINT IF EXISTS course_sessions_status_check;

-- Add new constraint that includes 'hidden' status
ALTER TABLE public.course_sessions 
ADD CONSTRAINT course_sessions_status_check 
CHECK (status IN ('scheduled', 'cancelled', 'completed', 'hidden'));

-- Update RLS policy to allow staff to see hidden sessions but exclude them from public view
DROP POLICY IF EXISTS "Users can view active course sessions" ON public.course_sessions;

-- New policy: regular users can only see scheduled sessions
CREATE POLICY "Users can view scheduled course sessions" 
ON public.course_sessions 
FOR SELECT 
USING (status = 'scheduled');

-- New policy: staff can see all sessions including hidden ones
CREATE POLICY "Staff can view all course sessions including hidden" 
ON public.course_sessions 
FOR SELECT 
USING (
  status IN ('scheduled', 'hidden', 'cancelled', 'completed') AND 
  (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gym_owner'::app_role) OR 
    has_role(auth.uid(), 'instructor'::app_role)
  )
);

-- Add function to toggle session visibility
CREATE OR REPLACE FUNCTION public.toggle_session_visibility(_session_id uuid, _new_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _actor uuid := auth.uid();
  _session_course_id uuid;
  _session_gym_id uuid;
  _instructor_id uuid;
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

  -- Check permissions
  IF NOT (
    -- Admin can manage all sessions
    has_role(_actor, 'admin'::app_role) OR
    -- Gym owner can manage sessions in their gym
    (has_role(_actor, 'gym_owner'::app_role) AND _session_gym_id = get_user_gym_id(_actor)) OR
    -- Super instructor can manage sessions in their gym
    (has_role(_actor, 'instructor'::app_role) AND instructor_has_owner_privileges(_actor) AND _session_gym_id = get_user_gym_id(_actor)) OR
    -- Regular instructor can manage their own sessions
    (has_role(_actor, 'instructor'::app_role) AND _instructor_id IN (
      SELECT i.id FROM public.instructors i WHERE i.user_id = _actor
    ))
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update session status
  UPDATE public.course_sessions 
  SET status = _new_status, updated_at = now()
  WHERE id = _session_id;

  RETURN true;
END;
$$;