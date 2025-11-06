-- ====================================================================
-- Fix RLS Policy for instructor_gym_assignments
-- Allow super instructors to manage assignments for their gym
-- ====================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Gym owners can manage their gym instructor assignments" 
ON public.instructor_gym_assignments;

-- Create new comprehensive policy for gym owners
CREATE POLICY "Gym owners can manage instructor assignments"
ON public.instructor_gym_assignments
FOR ALL
TO authenticated
USING (
  -- Global gym owners can manage any gym
  has_role(auth.uid(), 'gym_owner'::app_role)
)
WITH CHECK (
  -- Global gym owners can manage any gym
  has_role(auth.uid(), 'gym_owner'::app_role)
);

-- Add policy for super instructors with owner privileges
CREATE POLICY "Super instructors can manage their gym assignments"
ON public.instructor_gym_assignments
FOR ALL
TO authenticated
USING (
  -- Super instructors can manage assignments for gyms where they have owner privileges
  EXISTS (
    SELECT 1
    FROM public.instructors i
    INNER JOIN public.instructor_gym_assignments iga ON iga.instructor_id = i.id
    WHERE i.user_id = auth.uid()
      AND iga.gym_id = instructor_gym_assignments.gym_id
      AND iga.has_owner_privileges = true
      AND iga.is_active = true
  )
)
WITH CHECK (
  -- Super instructors can manage assignments for gyms where they have owner privileges
  EXISTS (
    SELECT 1
    FROM public.instructors i
    INNER JOIN public.instructor_gym_assignments iga ON iga.instructor_id = i.id
    WHERE i.user_id = auth.uid()
      AND iga.gym_id = instructor_gym_assignments.gym_id
      AND iga.has_owner_privileges = true
      AND iga.is_active = true
  )
);