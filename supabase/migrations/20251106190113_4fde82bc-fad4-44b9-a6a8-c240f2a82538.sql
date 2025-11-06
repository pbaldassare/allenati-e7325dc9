-- ====================================================================
-- Fix infinite recursion in instructor_gym_assignments RLS policy
-- Use security definer function to avoid recursive policy checks
-- ====================================================================

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Super instructors can manage their gym assignments" 
ON public.instructor_gym_assignments;

-- Create security definer function to check if instructor can manage a gym
-- This bypasses RLS and prevents recursive policy evaluation
CREATE OR REPLACE FUNCTION public.instructor_can_manage_gym(_user_id uuid, _gym_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user is a super instructor for this gym
  SELECT EXISTS (
    SELECT 1
    FROM public.instructors i
    INNER JOIN public.instructor_gym_assignments iga ON iga.instructor_id = i.id
    WHERE i.user_id = _user_id
      AND iga.gym_id = _gym_id
      AND iga.has_owner_privileges = true
      AND iga.is_active = true
  )
$$;

-- Create new policy using the security definer function
CREATE POLICY "Super instructors can manage their gym assignments"
ON public.instructor_gym_assignments
FOR ALL
TO authenticated
USING (
  -- Allow if user is a super instructor for this gym (using security definer function)
  public.instructor_can_manage_gym(auth.uid(), gym_id)
)
WITH CHECK (
  -- Allow if user is a super instructor for this gym (using security definer function)
  public.instructor_can_manage_gym(auth.uid(), gym_id)
);