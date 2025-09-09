-- Fix instructor duplicates and missing assignments - Phase 2 (Correct Approach)

-- Step 1: First, update courses that reference the problematic instructor to use the correct one
UPDATE public.courses 
SET instructor_id = (
    SELECT i.id FROM public.instructors i 
    WHERE i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' 
    AND i.is_active = true
    LIMIT 1
)
WHERE instructor_id IN (
    SELECT i.id FROM public.instructors i
    WHERE i.user_id = '33303415-93dc-4ed8-93fd-0ab7e283eb83'
);

-- Step 2: Remove the fake duplicate instructor assignments first
DELETE FROM public.instructor_gym_assignments 
WHERE instructor_id IN (
    SELECT i.id FROM public.instructors i
    WHERE i.user_id = '33303415-93dc-4ed8-93fd-0ab7e283eb83'
);

-- Step 3: Remove the fake duplicate instructor
DELETE FROM public.instructors 
WHERE user_id = '33303415-93dc-4ed8-93fd-0ab7e283eb83';

-- Step 4: Get the existing instructor ID for the real Fabio Pititto
-- and create missing assignments for all his gyms

-- For Combat Lab
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id,
    '8abc8f4d-4260-4850-a0d0-b1ada1265701', -- Combat Lab
    true,
    true
FROM public.instructors i
WHERE i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'
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
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga
    WHERE iga.instructor_id = i.id AND iga.gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b'
);

-- Step 5: Ensure all other legitimate instructors have their assignments
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