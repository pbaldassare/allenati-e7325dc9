-- Add has_owner_privileges field to instructors table
ALTER TABLE public.instructors 
ADD COLUMN has_owner_privileges boolean NOT NULL DEFAULT false;

-- Create helper function to check if an instructor has owner privileges
CREATE OR REPLACE FUNCTION public.instructor_has_owner_privileges(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.instructors
    WHERE user_id = _user_id
      AND is_active = true
      AND has_owner_privileges = true
  )
$$;

-- Create function to promote instructor to super instructor
CREATE OR REPLACE FUNCTION public.promote_instructor_to_super(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _actor uuid := auth.uid();
  _owner_gym_id uuid;
  _target_gym_id uuid;
BEGIN
  -- Only gym owners can promote instructors
  IF NOT has_role(_actor, 'gym_owner'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: Only gym owners can promote instructors';
  END IF;

  SELECT get_user_gym_id(_actor) INTO _owner_gym_id;
  IF _owner_gym_id IS NULL THEN
    RAISE EXCEPTION 'Owner gym not found';
  END IF;

  SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
  IF _target_gym_id IS DISTINCT FROM _owner_gym_id THEN
    RAISE EXCEPTION 'Instructor not in your gym';
  END IF;

  -- Update instructor privileges
  UPDATE public.instructors 
  SET has_owner_privileges = true
  WHERE user_id = _user_id AND gym_id = _owner_gym_id AND is_active = true;

  RETURN true;
END;
$$;

-- Create function to demote super instructor
CREATE OR REPLACE FUNCTION public.demote_super_instructor(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _actor uuid := auth.uid();
  _owner_gym_id uuid;
  _target_gym_id uuid;
BEGIN
  -- Only gym owners can demote instructors
  IF NOT has_role(_actor, 'gym_owner'::app_role) THEN
    RAISE EXCEPTION 'Permission denied: Only gym owners can demote instructors';
  END IF;

  SELECT get_user_gym_id(_actor) INTO _owner_gym_id;
  IF _owner_gym_id IS NULL THEN
    RAISE EXCEPTION 'Owner gym not found';
  END IF;

  SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
  IF _target_gym_id IS DISTINCT FROM _owner_gym_id THEN
    RAISE EXCEPTION 'Instructor not in your gym';
  END IF;

  -- Remove instructor privileges
  UPDATE public.instructors 
  SET has_owner_privileges = false
  WHERE user_id = _user_id AND gym_id = _owner_gym_id;

  RETURN true;
END;
$$;