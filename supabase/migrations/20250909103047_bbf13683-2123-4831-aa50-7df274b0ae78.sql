-- Clean up instructor duplicates and fix missing assignments - Final Fix

-- Step 1: Remove any courses that reference the duplicate Fabio Pititto (user_id: 2f99e3e5-17cb-4754-9142-d71bf2323a14)
UPDATE public.courses 
SET instructor_id = (
    SELECT i.id FROM public.instructors i 
    WHERE i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' 
    LIMIT 1
)
WHERE instructor_id IN (
    SELECT i.id FROM public.instructors i
    WHERE i.user_id = '2f99e3e5-17cb-4754-9142-d71bf2323a14'
);

-- Step 2: Remove the duplicate instructor assignments first
DELETE FROM public.instructor_gym_assignments 
WHERE instructor_id IN (
    SELECT i.id FROM public.instructors i
    WHERE i.user_id = '2f99e3e5-17cb-4754-9142-d71bf2323a14'
);

-- Step 3: Remove the duplicate instructor entry
DELETE FROM public.instructors 
WHERE user_id = '2f99e3e5-17cb-4754-9142-d71bf2323a14';

-- Step 4: Ensure all existing instructors have proper assignments
-- Create missing assignments for all instructors based on their gym_id field

-- For Combat Lab instructors
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id,
    i.gym_id,
    CASE 
        WHEN i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' THEN true -- Owner
        ELSE false -- Regular instructors
    END,
    true
FROM public.instructors i
WHERE i.gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701' -- Combat Lab
AND i.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga
    WHERE iga.instructor_id = i.id AND iga.gym_id = i.gym_id
);

-- For Charme instructors  
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id,
    i.gym_id,
    CASE 
        WHEN i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' THEN true -- Owner
        ELSE false -- Regular instructors
    END,
    true
FROM public.instructors i
WHERE i.gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b' -- Charme
AND i.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga
    WHERE iga.instructor_id = i.id AND iga.gym_id = i.gym_id
);

-- For BudoClanHq instructors
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id,
    i.gym_id,
    CASE 
        WHEN i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' THEN true -- Owner
        ELSE false -- Regular instructors
    END,
    true
FROM public.instructors i
WHERE i.gym_id = 'ea0804aa-0beb-485c-b3c8-fc31d30873b5' -- BudoClanHq
AND i.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga
    WHERE iga.instructor_id = i.id AND iga.gym_id = i.gym_id
);

-- Step 5: Clean up the deprecated gym_id field from instructors table
-- (This field should no longer be used since we now use instructor_gym_assignments)
-- Note: We'll keep it for now to avoid breaking existing code, but it should be removed in future

-- Step 6: Verify data integrity - Log current state for debugging
-- This will be visible in the Supabase logs