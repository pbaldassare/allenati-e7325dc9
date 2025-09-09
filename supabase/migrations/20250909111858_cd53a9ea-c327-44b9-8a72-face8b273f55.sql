-- Fix the function overloading issue by dropping the conflicting functions and creating a single clear one
DROP FUNCTION IF EXISTS public.promote_instructor_to_super(_user_id uuid);
DROP FUNCTION IF EXISTS public.promote_instructor_to_super(_user_id uuid, _gym_id uuid);

-- Create a single, clear function that works for the current use case
CREATE OR REPLACE FUNCTION public.promote_instructor_to_super(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _owner_gym_id uuid;
  _target_gym_id uuid;
  _instructor_id uuid;
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

  -- Get instructor_id
  SELECT id INTO _instructor_id
  FROM public.instructors 
  WHERE user_id = _user_id AND gym_id = _owner_gym_id AND is_active = true;

  IF _instructor_id IS NULL THEN
    RAISE EXCEPTION 'Instructor not found';
  END IF;

  -- Update instructor_gym_assignments privileges
  UPDATE public.instructor_gym_assignments 
  SET has_owner_privileges = true
  WHERE instructor_id = _instructor_id AND gym_id = _owner_gym_id AND is_active = true;

  RETURN true;
END;
$function$;

-- Similarly fix the demote function
DROP FUNCTION IF EXISTS public.demote_super_instructor(_user_id uuid);
DROP FUNCTION IF EXISTS public.demote_super_instructor(_user_id uuid, _gym_id uuid);

CREATE OR REPLACE FUNCTION public.demote_super_instructor(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _owner_gym_id uuid;
  _target_gym_id uuid;
  _instructor_id uuid;
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

  -- Get instructor_id
  SELECT id INTO _instructor_id
  FROM public.instructors 
  WHERE user_id = _user_id AND gym_id = _owner_gym_id AND is_active = true;

  IF _instructor_id IS NULL THEN
    RAISE EXCEPTION 'Instructor not found';
  END IF;

  -- Remove instructor_gym_assignments privileges
  UPDATE public.instructor_gym_assignments 
  SET has_owner_privileges = false
  WHERE instructor_id = _instructor_id AND gym_id = _owner_gym_id;

  RETURN true;
END;
$function$;