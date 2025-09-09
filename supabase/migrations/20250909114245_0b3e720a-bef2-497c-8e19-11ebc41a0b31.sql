-- Clean up inconsistent instructor_gym_assignments data
-- Remove assignments where the instructor's gym_id doesn't match the assignment's gym_id
DELETE FROM public.instructor_gym_assignments 
WHERE id IN (
  SELECT iga.id 
  FROM public.instructor_gym_assignments iga
  JOIN public.instructors i ON iga.instructor_id = i.id
  WHERE iga.gym_id != i.gym_id
    AND i.gym_id IS NOT NULL
);

-- Create missing instructor_gym_assignments for all active instructors
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
SELECT 
  i.id as instructor_id,
  i.gym_id,
  CASE 
    WHEN ugm.membership_type = 'owner' THEN true 
    ELSE false 
  END as has_owner_privileges,
  true as is_active
FROM public.instructors i
LEFT JOIN public.instructor_gym_assignments iga ON i.id = iga.instructor_id AND i.gym_id = iga.gym_id
LEFT JOIN public.user_gym_memberships ugm ON i.user_id = ugm.user_id AND i.gym_id = ugm.gym_id
WHERE i.is_active = true 
  AND i.gym_id IS NOT NULL
  AND iga.id IS NULL  -- Only insert if assignment doesn't exist
ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
  has_owner_privileges = EXCLUDED.has_owner_privileges,
  is_active = true;

-- Update existing assignments to ensure owner privileges are correct
UPDATE public.instructor_gym_assignments 
SET has_owner_privileges = true
WHERE instructor_id IN (
  SELECT i.id 
  FROM public.instructors i
  JOIN public.user_gym_memberships ugm ON i.user_id = ugm.user_id AND i.gym_id = ugm.gym_id
  WHERE ugm.membership_type = 'owner' AND ugm.status = 'active'
);