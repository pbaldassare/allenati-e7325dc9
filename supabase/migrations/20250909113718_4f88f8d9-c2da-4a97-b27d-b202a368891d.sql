-- Fix missing instructor records for gym owners and update privilege functions

-- First, create missing instructor records for gym owners who don't have them
DO $$
DECLARE
  owner_record RECORD;
  _instructor_id uuid;
  _user_profile RECORD;
BEGIN
  -- Loop through all gym owners who don't have instructor records
  FOR owner_record IN 
    SELECT DISTINCT ugm.user_id, ugm.gym_id, g.name as gym_name
    FROM public.user_gym_memberships ugm
    JOIN public.gyms g ON ugm.gym_id = g.id
    LEFT JOIN public.instructors i ON ugm.user_id = i.user_id
    WHERE ugm.membership_type = 'owner' 
      AND ugm.status = 'active'
      AND i.id IS NULL
  LOOP
    -- Get user profile info
    SELECT first_name, last_name INTO _user_profile
    FROM public.profiles
    WHERE user_id = owner_record.user_id;
    
    -- Create instructor record for the owner
    INSERT INTO public.instructors (user_id, gym_id, bio, is_active, first_name, last_name)
    VALUES (
      owner_record.user_id, 
      owner_record.gym_id, 
      'Proprietario e Istruttore della palestra',
      true,
      COALESCE(_user_profile.first_name, 'Nome'),
      COALESCE(_user_profile.last_name, 'Cognome')
    )
    RETURNING id INTO _instructor_id;
    
    -- Ensure instructor role is assigned
    INSERT INTO public.user_roles (user_id, role, is_active)
    VALUES (owner_record.user_id, 'instructor', true)
    ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
    
    -- Create instructor_gym_assignment with owner privileges
    INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
    VALUES (_instructor_id, owner_record.gym_id, true, true)
    ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
      has_owner_privileges = true,
      is_active = true;
    
    RAISE NOTICE 'Created instructor record for owner % in gym %', owner_record.user_id, owner_record.gym_name;
  END LOOP;
END $$;

-- Update promote_instructor_to_super function to allow admins
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
  _owner_gym_id uuid;
  _target_gym_id uuid;
  _instructor_id uuid;
BEGIN
  -- Check if actor is admin or gym owner
  SELECT has_role(_actor, 'admin'::app_role) INTO _actor_is_admin;
  SELECT has_role(_actor, 'gym_owner'::app_role) INTO _actor_is_owner;

  IF NOT (_actor_is_admin OR _actor_is_owner) THEN
    RAISE EXCEPTION 'Permission denied: Only admins or gym owners can promote instructors';
  END IF;

  -- If admin, get target user's gym; if owner, get actor's gym
  IF _actor_is_admin THEN
    SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
    IF _target_gym_id IS NULL THEN
      RAISE EXCEPTION 'Target user has no gym';
    END IF;
    _owner_gym_id := _target_gym_id;
  ELSE
    -- Gym owner path
    SELECT get_user_gym_id(_actor) INTO _owner_gym_id;
    IF _owner_gym_id IS NULL THEN
      RAISE EXCEPTION 'Owner gym not found';
    END IF;

    SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
    IF _target_gym_id IS DISTINCT FROM _owner_gym_id THEN
      RAISE EXCEPTION 'Instructor not in your gym';
    END IF;
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

-- Update demote_super_instructor function to allow admins
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
  _owner_gym_id uuid;
  _target_gym_id uuid;
  _instructor_id uuid;
BEGIN
  -- Check if actor is admin or gym owner
  SELECT has_role(_actor, 'admin'::app_role) INTO _actor_is_admin;
  SELECT has_role(_actor, 'gym_owner'::app_role) INTO _actor_is_owner;

  IF NOT (_actor_is_admin OR _actor_is_owner) THEN
    RAISE EXCEPTION 'Permission denied: Only admins or gym owners can demote instructors';
  END IF;

  -- If admin, get target user's gym; if owner, get actor's gym
  IF _actor_is_admin THEN
    SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
    IF _target_gym_id IS NULL THEN
      RAISE EXCEPTION 'Target user has no gym';
    END IF;
    _owner_gym_id := _target_gym_id;
  ELSE
    -- Gym owner path
    SELECT get_user_gym_id(_actor) INTO _owner_gym_id;
    IF _owner_gym_id IS NULL THEN
      RAISE EXCEPTION 'Owner gym not found';
    END IF;

    SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
    IF _target_gym_id IS DISTINCT FROM _owner_gym_id THEN
      RAISE EXCEPTION 'Instructor not in your gym';
    END IF;
  END IF;

  -- Get instructor_id
  SELECT id INTO _instructor_id
  FROM public.instructors 
  WHERE user_id = _user_id AND gym_id = _owner_gym_id AND is_active = true;

  IF _instructor_id IS NULL THEN
    RAISE EXCEPTION 'Instructor not found';
  END IF;

  -- Remove instructor_gym_assignments privileges (but don't remove if they're the gym owner)
  UPDATE public.instructor_gym_assignments 
  SET has_owner_privileges = false
  WHERE instructor_id = _instructor_id 
    AND gym_id = _owner_gym_id
    AND NOT EXISTS (
      SELECT 1 FROM public.user_gym_memberships ugm
      WHERE ugm.user_id = _user_id 
        AND ugm.gym_id = _owner_gym_id
        AND ugm.membership_type = 'owner'
        AND ugm.status = 'active'
    );

  RETURN true;
END;
$function$;