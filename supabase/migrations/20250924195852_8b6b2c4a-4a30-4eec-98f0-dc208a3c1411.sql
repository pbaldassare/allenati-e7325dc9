-- Fix RLS policies for gym_credits to support super instructors

-- Drop existing gym owner policy that only works with single gym
DROP POLICY IF EXISTS "Gym owners can view their gym member credits" ON public.gym_credits;

-- Create new policy for gym owners that supports multiple gyms
CREATE POLICY "Gym owners can view their gym member credits" 
ON public.gym_credits 
FOR SELECT 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

-- Add new policy for super instructors
CREATE POLICY "Super instructors can view their gym member credits" 
ON public.gym_credits 
FOR SELECT 
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id)
);

-- Create policy for super instructors to manage gym credits (INSERT/UPDATE)
CREATE POLICY "Super instructors can manage their gym member credits" 
ON public.gym_credits 
FOR ALL 
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id)
)
WITH CHECK (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id)
);