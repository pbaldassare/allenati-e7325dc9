-- Fix instructor assignments and remove duplicates

-- 1. Remove the problematic duplicate instructor assignment that's incorrectly assigned to all gyms
-- This instructor (9bb75368-12d6-46f3-977a-fb9357e4dcca) should only be in BudoClanHq
DELETE FROM public.instructor_gym_assignments 
WHERE instructor_id = '9bb75368-12d6-46f3-977a-fb9357e4dcca' 
AND gym_id IN ('8abc8f4d-4260-4850-a0d0-b1ada1265701', '24140ca1-d9b9-4987-a5b8-6077fa20015b');

-- 2. Create missing assignments for legitimate instructors in Combat Lab
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id as instructor_id,
    i.gym_id,
    CASE WHEN i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' THEN true ELSE false END as has_owner_privileges,
    true as is_active
FROM public.instructors i
WHERE i.gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701' -- Combat Lab
AND i.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga 
    WHERE iga.instructor_id = i.id AND iga.gym_id = i.gym_id
)
ON CONFLICT (instructor_id, gym_id) DO NOTHING;

-- 3. Create missing assignments for legitimate instructors in Charme  
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
    i.id as instructor_id,
    i.gym_id,
    CASE WHEN i.user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' THEN true ELSE false END as has_owner_privileges,
    true as is_active
FROM public.instructors i
WHERE i.gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b' -- Charme
AND i.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM public.instructor_gym_assignments iga 
    WHERE iga.instructor_id = i.id AND iga.gym_id = i.gym_id
)
ON CONFLICT (instructor_id, gym_id) DO NOTHING;

-- 4. Ensure the correct owner privileges for Fabio Pititto in BudoClanHq
UPDATE public.instructor_gym_assignments 
SET has_owner_privileges = true
WHERE instructor_id = '9bb75368-12d6-46f3-977a-fb9357e4dcca'
AND gym_id = 'ea0804aa-0beb-485c-b3c8-fc31d30873b5'; -- BudoClanHq

-- 5. Remove any incorrect owner privileges from non-owners
UPDATE public.instructor_gym_assignments 
SET has_owner_privileges = false
WHERE instructor_id IN (
    SELECT i.id FROM public.instructors i
    WHERE i.user_id != 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7' -- Not Fabio
)
AND has_owner_privileges = true;