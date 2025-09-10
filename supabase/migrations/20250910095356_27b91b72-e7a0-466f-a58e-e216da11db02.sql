-- Fix all instructor privilege inconsistencies across all gyms

-- 1. Fix has_owner_privileges inconsistencies for Fabio Pititto (4 gyms)
UPDATE public.instructors 
SET has_owner_privileges = true
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'fabio.pititto@example.com'
) AND has_owner_privileges = false;

-- 2. Fix has_owner_privileges inconsistencies for Demo User (1 gym)
UPDATE public.instructors 
SET has_owner_privileges = true
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'demo@example.com'
) AND has_owner_privileges = false;

-- 3. Fix membership_type inconsistencies for Combat Lab instructors
UPDATE public.user_gym_memberships 
SET membership_type = 'owner'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN (
    'filippofagiolo@icloud.com',
    'francescocucchiella@icloud.com', 
    'giovannimaniga@icloud.com'
  )
) AND membership_type = 'member' 
AND gym_id IN (
  SELECT id FROM public.gyms WHERE name = 'Combat Lab'
);

-- 4. Create a function to maintain consistency between instructor privileges and gym assignments
CREATE OR REPLACE FUNCTION public.sync_instructor_owner_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- When instructor_gym_assignments changes, sync with instructors table
  IF TG_TABLE_NAME = 'instructor_gym_assignments' THEN
    UPDATE public.instructors 
    SET has_owner_privileges = NEW.has_owner_privileges
    WHERE id = NEW.instructor_id;
    RETURN NEW;
  END IF;
  
  -- When instructors table changes, sync with instructor_gym_assignments
  IF TG_TABLE_NAME = 'instructors' THEN
    UPDATE public.instructor_gym_assignments 
    SET has_owner_privileges = NEW.has_owner_privileges
    WHERE instructor_id = NEW.id;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. Create triggers to maintain consistency
DROP TRIGGER IF EXISTS sync_instructor_privileges_from_assignments ON public.instructor_gym_assignments;
CREATE TRIGGER sync_instructor_privileges_from_assignments
  AFTER UPDATE ON public.instructor_gym_assignments
  FOR EACH ROW
  WHEN (OLD.has_owner_privileges IS DISTINCT FROM NEW.has_owner_privileges)
  EXECUTE FUNCTION public.sync_instructor_owner_privileges();

DROP TRIGGER IF EXISTS sync_instructor_privileges_from_instructors ON public.instructors;
CREATE TRIGGER sync_instructor_privileges_from_instructors
  AFTER UPDATE ON public.instructors
  FOR EACH ROW
  WHEN (OLD.has_owner_privileges IS DISTINCT FROM NEW.has_owner_privileges)
  EXECUTE FUNCTION public.sync_instructor_owner_privileges();

-- 6. Add a function to validate instructor consistency
CREATE OR REPLACE FUNCTION public.validate_instructor_consistency()
RETURNS TABLE(
  user_email text,
  gym_name text,
  issue_type text,
  instructor_privileges boolean,
  assignment_privileges boolean,
  membership_type text
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT 
    au.email as user_email,
    g.name as gym_name,
    CASE 
      WHEN i.has_owner_privileges != iga.has_owner_privileges THEN 'PRIVILEGE_MISMATCH'
      WHEN iga.has_owner_privileges = true AND ugm.membership_type != 'owner' THEN 'MEMBERSHIP_TYPE_MISMATCH'
      ELSE 'CONSISTENT'
    END as issue_type,
    i.has_owner_privileges as instructor_privileges,
    iga.has_owner_privileges as assignment_privileges,
    ugm.membership_type
  FROM public.instructors i
  JOIN public.instructor_gym_assignments iga ON i.id = iga.instructor_id
  JOIN public.gyms g ON iga.gym_id = g.id
  JOIN auth.users au ON i.user_id = au.id
  JOIN public.user_gym_memberships ugm ON i.user_id = ugm.user_id AND iga.gym_id = ugm.gym_id
  WHERE i.is_active = true AND iga.is_active = true AND ugm.status = 'active'
  ORDER BY au.email, g.name;
$function$;