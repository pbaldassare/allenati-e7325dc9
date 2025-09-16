-- Fix RLS policies for subscription_plans to support multi-gym owners
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Gym owners can create plans for their gym" ON public.subscription_plans;
DROP POLICY IF EXISTS "Gym owners can update plans for their gym" ON public.subscription_plans;
DROP POLICY IF EXISTS "Gym owners can manage their subscription plans" ON public.subscription_plans;

-- Create new policies that allow gym owners to manage plans for ANY gym they own
CREATE POLICY "Gym owners can create plans for their gyms" ON public.subscription_plans
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

CREATE POLICY "Gym owners can update plans for their gyms" ON public.subscription_plans
FOR UPDATE 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
) 
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

CREATE POLICY "Gym owners can manage their subscription plans" ON public.subscription_plans
FOR ALL 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
) 
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
);