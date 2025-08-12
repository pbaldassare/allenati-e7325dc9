-- Create function to demote an instructor back to regular user
CREATE OR REPLACE FUNCTION public.demote_instructor_to_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _actor_is_admin boolean;
  _actor_is_owner boolean;
  _owner_gym_id uuid;
  _target_gym_id uuid;
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
    SELECT get_user_gym_id(_actor) INTO _owner_gym_id;
    IF _owner_gym_id IS NULL THEN
      RAISE EXCEPTION 'Owner gym not found';
    END IF;

    SELECT get_user_gym_id(target_user_id) INTO _target_gym_id;
    IF _target_gym_id IS DISTINCT FROM _owner_gym_id THEN
      RAISE EXCEPTION 'User not in your gym';
    END IF;
  ELSE
    -- Admin path: use target user's gym
    SELECT get_user_gym_id(target_user_id) INTO _target_gym_id;
    IF _target_gym_id IS NULL THEN
      RAISE EXCEPTION 'Target user has no gym';
    END IF;
    _owner_gym_id := _target_gym_id;
  END IF;

  -- Deactivate instructor record
  UPDATE public.instructors 
  SET is_active = false
  WHERE user_id = target_user_id AND gym_id = _owner_gym_id;

  -- Deactivate instructor role
  UPDATE public.user_roles
  SET is_active = false
  WHERE user_id = target_user_id AND role = 'instructor'::app_role;

  RETURN true;
END;
$function$;