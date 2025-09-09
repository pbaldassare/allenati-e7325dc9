-- Fix promote_instructor_to_super function to handle multiple gym ownership
CREATE OR REPLACE FUNCTION public.promote_instructor_to_super(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _actor_is_admin boolean;
  _actor_is_owner boolean;
  _actor_owned_gyms uuid[];
  _target_gym_id uuid;
  _instructor_id uuid;
BEGIN
  -- Check if actor is admin or gym owner
  SELECT has_role(_actor, 'admin'::app_role) INTO _actor_is_admin;
  SELECT has_role(_actor, 'gym_owner'::app_role) INTO _actor_is_owner;

  IF NOT (_actor_is_admin OR _actor_is_owner) THEN
    RAISE EXCEPTION 'Permission denied: Only admins or gym owners can promote instructors';
  END IF;

  -- Get target user's gym
  SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
  IF _target_gym_id IS NULL THEN
    RAISE EXCEPTION 'Target user has no gym';
  END IF;

  -- If admin, allow promotion; if owner, check if target gym is owned by actor
  IF _actor_is_admin THEN
    -- Admin can promote instructors in any gym
    NULL;
  ELSE
    -- Gym owner path - check if target gym is in owned gyms
    SELECT get_user_owned_gyms(_actor) INTO _actor_owned_gyms;
    IF _actor_owned_gyms IS NULL OR NOT (_target_gym_id = ANY(_actor_owned_gyms)) THEN
      RAISE EXCEPTION 'Permission denied: Instructor not in your owned gyms';
    END IF;
  END IF;

  -- Get instructor_id
  SELECT id INTO _instructor_id
  FROM public.instructors 
  WHERE user_id = _user_id AND gym_id = _target_gym_id AND is_active = true;

  IF _instructor_id IS NULL THEN
    RAISE EXCEPTION 'Instructor not found';
  END IF;

  -- Update instructor_gym_assignments privileges
  UPDATE public.instructor_gym_assignments 
  SET has_owner_privileges = true
  WHERE instructor_id = _instructor_id AND gym_id = _target_gym_id AND is_active = true;

  RETURN true;
END;
$function$;

-- Fix demote_super_instructor function to handle multiple gym ownership
CREATE OR REPLACE FUNCTION public.demote_super_instructor(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _actor_is_admin boolean;
  _actor_is_owner boolean;
  _actor_owned_gyms uuid[];
  _target_gym_id uuid;
  _instructor_id uuid;
BEGIN
  -- Check if actor is admin or gym owner
  SELECT has_role(_actor, 'admin'::app_role) INTO _actor_is_admin;
  SELECT has_role(_actor, 'gym_owner'::app_role) INTO _actor_is_owner;

  IF NOT (_actor_is_admin OR _actor_is_owner) THEN
    RAISE EXCEPTION 'Permission denied: Only admins or gym owners can demote instructors';
  END IF;

  -- Get target user's gym
  SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
  IF _target_gym_id IS NULL THEN
    RAISE EXCEPTION 'Target user has no gym';
  END IF;

  -- If admin, allow demotion; if owner, check if target gym is owned by actor
  IF _actor_is_admin THEN
    -- Admin can demote instructors in any gym
    NULL;
  ELSE
    -- Gym owner path - check if target gym is in owned gyms
    SELECT get_user_owned_gyms(_actor) INTO _actor_owned_gyms;
    IF _actor_owned_gyms IS NULL OR NOT (_target_gym_id = ANY(_actor_owned_gyms)) THEN
      RAISE EXCEPTION 'Permission denied: Instructor not in your owned gyms';
    END IF;
  END IF;

  -- Get instructor_id
  SELECT id INTO _instructor_id
  FROM public.instructors 
  WHERE user_id = _user_id AND gym_id = _target_gym_id AND is_active = true;

  IF _instructor_id IS NULL THEN
    RAISE EXCEPTION 'Instructor not found';
  END IF;

  -- Remove instructor_gym_assignments privileges (but don't remove if they're the gym owner)
  UPDATE public.instructor_gym_assignments 
  SET has_owner_privileges = false
  WHERE instructor_id = _instructor_id 
    AND gym_id = _target_gym_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_gym_memberships ugm
      WHERE ugm.user_id = _user_id 
        AND ugm.gym_id = _target_gym_id
        AND ugm.membership_type = 'owner'
        AND ugm.status = 'active'
    );

  RETURN true;
END;
$function$;