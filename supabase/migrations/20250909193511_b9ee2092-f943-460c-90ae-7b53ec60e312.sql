-- Consolidate ownership under f.f.combatlab@gmail.com account
-- Step 1: Get the user IDs for both accounts
DO $$
DECLARE
    official_user_id uuid;
    duplicate_user_id uuid;
    charme_gym_id uuid;
    budoclanhq_gym_id uuid;
    combat_lab_gym_id uuid;
    official_instructor_id uuid;
BEGIN
    -- Get user IDs
    SELECT id INTO official_user_id FROM auth.users WHERE email = 'f.f.combatlab@gmail.com';
    SELECT id INTO duplicate_user_id FROM auth.users WHERE email = 'charme.asd@gmail.com';
    
    -- Get gym IDs
    SELECT id INTO charme_gym_id FROM public.gyms WHERE name = 'Charme';
    SELECT id INTO budoclanhq_gym_id FROM public.gyms WHERE name = 'BudoClanHq';
    SELECT id INTO combat_lab_gym_id FROM public.gyms WHERE name = 'Combat Lab';
    
    -- Step 2: Remove duplicate ownership from charme.asd@gmail.com
    DELETE FROM public.user_gym_memberships 
    WHERE user_id = duplicate_user_id 
      AND gym_id = charme_gym_id 
      AND membership_type = 'owner';
    
    -- Step 3: Ensure official account owns Charme gym
    INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
    VALUES (official_user_id, charme_gym_id, 'owner', 'active')
    ON CONFLICT (user_id, gym_id) DO UPDATE SET
      membership_type = 'owner',
      status = 'active';
    
    -- Step 4: Deactivate duplicate instructor record
    UPDATE public.instructors 
    SET is_active = false
    WHERE user_id = duplicate_user_id;
    
    -- Remove duplicate instructor assignments
    UPDATE public.instructor_gym_assignments 
    SET is_active = false
    WHERE instructor_id IN (
      SELECT id FROM public.instructors WHERE user_id = duplicate_user_id
    );
    
    -- Step 5: Create/update instructor record for official account
    INSERT INTO public.instructors (user_id, gym_id, bio, is_active, first_name, last_name)
    VALUES (
      official_user_id, 
      charme_gym_id, -- Set primary gym as Charme
      'Proprietario e Istruttore di tutte le palestre',
      true,
      'Fabio',
      'Frabetti'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      is_active = true,
      bio = 'Proprietario e Istruttore di tutte le palestre',
      first_name = 'Fabio',
      last_name = 'Frabetti';
    
    -- Get the instructor ID for the official account
    SELECT id INTO official_instructor_id 
    FROM public.instructors 
    WHERE user_id = official_user_id AND is_active = true;
    
    -- Step 6: Create instructor_gym_assignments with owner privileges for all three gyms
    -- Charme
    INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
    VALUES (official_instructor_id, charme_gym_id, true, true)
    ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
      has_owner_privileges = true,
      is_active = true;
    
    -- BudoClanHq
    INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
    VALUES (official_instructor_id, budoclanhq_gym_id, true, true)
    ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
      has_owner_privileges = true,
      is_active = true;
    
    -- Combat Lab
    INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
    VALUES (official_instructor_id, combat_lab_gym_id, true, true)
    ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
      has_owner_privileges = true,
      is_active = true;
    
    -- Step 7: Ensure official account has all necessary roles
    INSERT INTO public.user_roles (user_id, role, is_active)
    VALUES 
      (official_user_id, 'basic_user', true),
      (official_user_id, 'gym_owner', true),
      (official_user_id, 'instructor', true)
    ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
    
    RAISE NOTICE 'Successfully consolidated ownership under f.f.combatlab@gmail.com';
    RAISE NOTICE 'Official user ID: %', official_user_id;
    RAISE NOTICE 'Instructor ID: %', official_instructor_id;
    
END $$;