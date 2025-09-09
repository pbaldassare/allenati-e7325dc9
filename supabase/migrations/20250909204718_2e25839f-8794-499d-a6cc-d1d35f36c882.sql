-- Fix promote_user_to_instructor to handle owners with multiple gyms
CREATE OR REPLACE FUNCTION public.promote_user_to_instructor(target_user_id uuid, bio text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _actor_is_admin boolean;
  _actor_is_owner boolean;
  _actor_owned_gyms uuid[];
  _target_gym_id uuid;
  _instructor_id uuid;
  _target_user_gym_id uuid;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT has_role(_actor, 'admin'::app_role) INTO _actor_is_admin;
  SELECT has_role(_actor, 'gym_owner'::app_role) INTO _actor_is_owner;

  IF NOT (_actor_is_admin OR _actor_is_owner) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF _actor_is_owner THEN
    -- Get all gyms owned by the actor
    SELECT get_user_owned_gyms(_actor) INTO _actor_owned_gyms;
    IF _actor_owned_gyms IS NULL OR array_length(_actor_owned_gyms, 1) = 0 THEN
      RAISE EXCEPTION 'Owner has no gyms';
    END IF;

    -- Get target user's gym
    SELECT get_user_gym_id(target_user_id) INTO _target_user_gym_id;
    IF _target_user_gym_id IS NULL THEN
      RAISE EXCEPTION 'Target user has no gym';
    END IF;

    -- Check if target user's gym is in owner's gyms
    IF NOT (_target_user_gym_id = ANY(_actor_owned_gyms)) THEN
      RAISE EXCEPTION 'User not in your owned gyms';
    END IF;
    
    -- Use the target user's gym as the gym for the instructor
    _target_gym_id := _target_user_gym_id;
  ELSE
    -- Admin path: use target user's gym
    SELECT get_user_gym_id(target_user_id) INTO _target_user_gym_id;
    IF _target_user_gym_id IS NULL THEN
      RAISE EXCEPTION 'Target user has no gym';
    END IF;
    _target_gym_id := _target_user_gym_id;
  END IF;

  -- Upsert instructor row
  INSERT INTO public.instructors (user_id, gym_id, bio, is_active)
  VALUES (target_user_id, _target_gym_id, bio, true)
  ON CONFLICT (user_id) DO UPDATE
    SET gym_id = EXCLUDED.gym_id,
        bio = COALESCE(EXCLUDED.bio, public.instructors.bio),
        is_active = true
  RETURNING id INTO _instructor_id;

  -- Ensure instructor role
  INSERT INTO public.user_roles (user_id, role, is_active)
  VALUES (target_user_id, 'instructor'::app_role, true)
  ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

  RETURN _instructor_id;
END;
$function$;