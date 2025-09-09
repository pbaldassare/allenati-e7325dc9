-- Fix instructor duplicates and missing assignments - Phase 2

-- Step 1: Remove the fake duplicate "fabio pititto" from Combat Lab
-- This user (33303415-93dc-4ed8-93fd-0ab7e283eb83) should not exist and is causing confusion
DELETE FROM public.instructor_gym_assignments 
WHERE instructor_id IN (
    SELECT i.id FROM public.instructors i
    WHERE i.user_id = '33303415-93dc-4ed8-93fd-0ab7e283eb83'
);

DELETE FROM public.instructors 
WHERE user_id = '33303415-93dc-4ed8-93fd-0ab7e283eb83';

-- Step 2: Ensure the real Fabio Pititto (aa41bb9f-2634-4b0a-972c-d6fc12ce06b7) has proper assignments
-- First, check if instructor record exists, if not create it for each gym

-- For Combat Lab
INSERT INTO public.instructors (user_id, gym_id, bio, is_active, first_name, last_name)
SELECT 
    'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7',
    '8abc8f4d-4260-4850-a0d0-b1ada1265701', -- Combat Lab
    'Proprietario e Istruttore della palestra',
    true,
    'Fabio',
    'Pititto'
WHERE NOT EXISTS (
    SELECT 1 FROM public.instructors 
    WHERE user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' 
    AND gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701'
);

-- For Charme
INSERT INTO public.instructors (user_id, gym_id, bio, is_active, first_name, last_name)
SELECT 
    'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7',
    '24140ca1-d9b9-4987-a5b8-6077fa20015b', -- Charme
    'Proprietario e Istruttore della palestra',
    true,
    'Fabio',
    'Pititto'
WHERE NOT EXISTS (
    SELECT 1 FROM public.instructors 
    WHERE user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' 
    AND gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b'
);

-- Step 3: Create the missing assignments with owner privileges for the real Fabio
-- For Combat Lab
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id,
    '8abc8f4d-4260-4850-a0d0-b1ada1265701', -- Combat Lab
    true,
    true
FROM public.instructors i
WHERE i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'
AND i.gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701'
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga
    WHERE iga.instructor_id = i.id AND iga.gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701'
);

-- For Charme
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id,
    '24140ca1-d9b9-4987-a5b8-6077fa20015b', -- Charme
    true,
    true
FROM public.instructors i
WHERE i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'
AND i.gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b'
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga
    WHERE iga.instructor_id = i.id AND iga.gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b'
);

-- Step 4: Ensure all other legitimate instructors have their assignments
-- For Combat Lab
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id,
    i.gym_id,
    false, -- No owner privileges for non-owners
    true
FROM public.instructors i
WHERE i.gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701' -- Combat Lab
AND i.is_active = true
AND i.user_id != 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' -- Not the owner
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga
    WHERE iga.instructor_id = i.id AND iga.gym_id = i.gym_id
);

-- For Charme
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id,
    i.gym_id,
    false, -- No owner privileges for non-owners  
    true
FROM public.instructors i
WHERE i.gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b' -- Charme
AND i.is_active = true
AND i.user_id != 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' -- Not the owner
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga
    WHERE iga.instructor_id = i.id AND iga.gym_id = i.gym_id
);

-- Step 5: Clean up any duplicate assignments (keep the most recent one per instructor-gym pair)
WITH duplicate_assignments AS (
    SELECT 
        instructor_id,
        gym_id,
        id,
        ROW_NUMBER() OVER (PARTITION BY instructor_id, gym_id ORDER BY created_at DESC) as rn
    FROM public.instructor_gym_assignments
)
DELETE FROM public.instructor_gym_assignments
WHERE id IN (
    SELECT id FROM duplicate_assignments WHERE rn > 1
);