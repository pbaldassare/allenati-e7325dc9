-- Funzione per sistemare tutti i proprietari che non hanno record istruttore appropriati
CREATE OR REPLACE FUNCTION public.fix_missing_owner_instructors()
RETURNS TABLE(
  fixed_user_id uuid,
  fixed_gym_id uuid,
  user_name text,
  gym_name text,
  action_taken text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  missing_record RECORD;
  _instructor_id uuid;
  _user_profile RECORD;
  _gym_name text;
  _existing_instructor_id uuid;
BEGIN
  -- Loop attraverso tutti i proprietari che non hanno assignment nella palestra specifica
  FOR missing_record IN 
    SELECT DISTINCT ugm.user_id as owner_user_id, ugm.gym_id as owner_gym_id
    FROM public.user_gym_memberships ugm
    LEFT JOIN public.instructors i ON ugm.user_id = i.user_id
    LEFT JOIN public.instructor_gym_assignments iga ON i.id = iga.instructor_id AND ugm.gym_id = iga.gym_id
    WHERE ugm.membership_type = 'owner' 
      AND ugm.status = 'active'
      AND (i.id IS NULL OR iga.id IS NULL)
  LOOP
    -- Get user profile info
    SELECT first_name, last_name INTO _user_profile
    FROM public.profiles
    WHERE profiles.user_id = missing_record.owner_user_id;
    
    -- Get gym name
    SELECT name INTO _gym_name
    FROM public.gyms
    WHERE id = missing_record.owner_gym_id;
    
    -- Check if instructor record exists
    SELECT id INTO _existing_instructor_id
    FROM public.instructors
    WHERE user_id = missing_record.owner_user_id;
    
    IF _existing_instructor_id IS NULL THEN
      -- Create instructor record
      INSERT INTO public.instructors (user_id, gym_id, bio, is_active, first_name, last_name)
      VALUES (
        missing_record.owner_user_id, 
        missing_record.owner_gym_id, 
        'Proprietario e Istruttore della palestra',
        true,
        COALESCE(_user_profile.first_name, 'Nome'),
        COALESCE(_user_profile.last_name, 'Cognome')
      )
      RETURNING id INTO _instructor_id;
    ELSE
      _instructor_id := _existing_instructor_id;
      -- Update existing instructor to be active and set gym_id if needed
      UPDATE public.instructors 
      SET is_active = true, 
          gym_id = COALESCE(gym_id, missing_record.owner_gym_id),
          first_name = COALESCE(first_name, _user_profile.first_name),
          last_name = COALESCE(last_name, _user_profile.last_name)
      WHERE id = _instructor_id;
    END IF;
    
    -- Ensure instructor role is assigned
    INSERT INTO public.user_roles (user_id, role, is_active)
    VALUES (missing_record.owner_user_id, 'instructor', true)
    ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
    
    -- Create instructor_gym_assignment with owner privileges
    INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
    VALUES (_instructor_id, missing_record.owner_gym_id, true, true)
    ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
      has_owner_privileges = true,
      is_active = true;
    
    -- Return the action taken
    fixed_user_id := missing_record.owner_user_id;
    fixed_gym_id := missing_record.owner_gym_id;
    user_name := COALESCE(_user_profile.first_name || ' ' || _user_profile.last_name, 'Nome Cognome');
    gym_name := _gym_name;
    action_taken := CASE 
      WHEN _existing_instructor_id IS NULL THEN 'Created instructor record and assignment with owner privileges'
      ELSE 'Created assignment with owner privileges for existing instructor'
    END;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Eseguire la funzione per sistemare tutti i casi esistenti
SELECT * FROM public.fix_missing_owner_instructors();