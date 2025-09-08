-- Fix instructor status for Fabio Pititto for all his gyms and transfer BudoClanHq ownership

-- Step 1: Create instructor records for Fabio for Combat Lab and Charme (if not exist)
-- For Combat Lab (8abc8f4d-4260-4850-a0d0-b1ada1265701)
INSERT INTO public.instructors (user_id, gym_id, bio, is_active, first_name, last_name)
VALUES (
  'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7', 
  '8abc8f4d-4260-4850-a0d0-b1ada1265701',
  'Proprietario e Istruttore della palestra',
  true,
  'Fabio',
  'Pititto'
)
ON CONFLICT (user_id) DO UPDATE SET
  gym_id = EXCLUDED.gym_id,
  is_active = true,
  bio = COALESCE(EXCLUDED.bio, instructors.bio);

-- For Charme (24140ca1-d9b9-4987-a5b8-6077fa20015b) 
INSERT INTO public.instructors (user_id, gym_id, bio, is_active, first_name, last_name)
VALUES (
  'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7', 
  '24140ca1-d9b9-4987-a5b8-6077fa20015b',
  'Proprietario e Istruttore della palestra',
  true,
  'Fabio',
  'Pititto'
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Transfer BudoClanHq ownership from current owner to Fabio
-- First remove current owner membership for BudoClanHq
UPDATE public.user_gym_memberships 
SET status = 'inactive', updated_at = now()
WHERE gym_id = 'ea0804aa-0beb-485c-b3c8-fc31d30873b5' 
  AND membership_type = 'owner' 
  AND status = 'active';

-- Add Fabio as owner of BudoClanHq
INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
VALUES ('aa41bb9f-2634-4b0a-972c-d6fc12ce06b7', 'ea0804aa-0beb-485c-b3c8-fc31d30873b5', 'owner', 'active')
ON CONFLICT (user_id, gym_id) DO UPDATE SET
  membership_type = 'owner',
  status = 'active',
  updated_at = now();

-- Create instructor record for Fabio for BudoClanHq
INSERT INTO public.instructors (user_id, gym_id, bio, is_active, first_name, last_name)
VALUES (
  'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7', 
  'ea0804aa-0beb-485c-b3c8-fc31d30873b5',
  'Proprietario e Istruttore della palestra',
  true,
  'Fabio',
  'Pititto'
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Ensure instructor role is assigned to Fabio
INSERT INTO public.user_roles (user_id, role, is_active)
VALUES ('aa41bb9f-2634-4b0a-972c-d6fc12ce06b7', 'instructor', true)
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

-- Step 4: Create instructor_gym_assignments with owner privileges for all Fabio's gyms
WITH fabio_instructors AS (
  SELECT i.id as instructor_id, i.gym_id
  FROM public.instructors i
  WHERE i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'
    AND i.is_active = true
)
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT instructor_id, gym_id, true, true
FROM fabio_instructors
ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
  has_owner_privileges = true,
  is_active = true;

-- Step 5: Create trigger to automatically make gym owners instructors
CREATE OR REPLACE FUNCTION public.auto_create_owner_instructor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _instructor_id uuid;
  _user_profile RECORD;
BEGIN
  -- Only process when someone becomes an owner
  IF NEW.membership_type = 'owner' AND NEW.status = 'active' THEN
    
    -- Get user profile info
    SELECT first_name, last_name INTO _user_profile
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    -- Create instructor record if it doesn't exist
    INSERT INTO public.instructors (user_id, gym_id, bio, is_active, first_name, last_name)
    VALUES (
      NEW.user_id, 
      NEW.gym_id, 
      'Proprietario e Istruttore della palestra',
      true,
      COALESCE(_user_profile.first_name, 'Nome'),
      COALESCE(_user_profile.last_name, 'Cognome')
    )
    ON CONFLICT (user_id) DO UPDATE SET
      gym_id = EXCLUDED.gym_id,
      is_active = true,
      bio = COALESCE(EXCLUDED.bio, instructors.bio),
      first_name = COALESCE(EXCLUDED.first_name, instructors.first_name),
      last_name = COALESCE(EXCLUDED.last_name, instructors.last_name)
    RETURNING id INTO _instructor_id;
    
    -- Get instructor_id if it was updated instead of inserted
    IF _instructor_id IS NULL THEN
      SELECT id INTO _instructor_id 
      FROM public.instructors 
      WHERE user_id = NEW.user_id;
    END IF;
    
    -- Ensure instructor role is assigned
    INSERT INTO public.user_roles (user_id, role, is_active)
    VALUES (NEW.user_id, 'instructor', true)
    ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
    
    -- Create instructor_gym_assignment with owner privileges
    INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
    VALUES (_instructor_id, NEW.gym_id, true, true)
    ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
      has_owner_privileges = true,
      is_active = true;
      
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_gym_memberships
DROP TRIGGER IF EXISTS auto_create_owner_instructor_trigger ON public.user_gym_memberships;
CREATE TRIGGER auto_create_owner_instructor_trigger
  AFTER INSERT OR UPDATE ON public.user_gym_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_owner_instructor();

-- Step 6: Add default rooms to BudoClanHq if they don't exist
SELECT add_default_rooms_to_gym('ea0804aa-0beb-485c-b3c8-fc31d30873b5');