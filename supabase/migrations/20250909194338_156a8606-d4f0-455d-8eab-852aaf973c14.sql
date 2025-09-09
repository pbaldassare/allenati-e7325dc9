-- Fix Fabio's last name in instructors table to match his profile
UPDATE public.instructors 
SET last_name = 'Pititto'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'f.f.combatlab@gmail.com'
) AND last_name = 'Frabetti';

-- Verify the fix worked
DO $$
DECLARE
    instructor_name text;
    profile_name text;
BEGIN
    SELECT first_name || ' ' || last_name INTO instructor_name
    FROM public.instructors 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'f.f.combatlab@gmail.com');
    
    SELECT first_name || ' ' || last_name INTO profile_name
    FROM public.profiles 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'f.f.combatlab@gmail.com');
    
    RAISE NOTICE 'Instructor name: %', instructor_name;
    RAISE NOTICE 'Profile name: %', profile_name;
    
    IF instructor_name = profile_name THEN
        RAISE NOTICE 'SUCCESS: Names are now synchronized';
    ELSE
        RAISE NOTICE 'WARNING: Names still do not match';
    END IF;
END $$;