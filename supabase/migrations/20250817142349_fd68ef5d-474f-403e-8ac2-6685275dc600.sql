-- Update subscription_plans RLS policies to allow gym owners to manage their plans
DROP POLICY IF EXISTS "Gym owners can create plans for their gym" ON public.subscription_plans;
DROP POLICY IF EXISTS "Gym owners can update plans for their gym" ON public.subscription_plans;
DROP POLICY IF EXISTS "Gym owners can view plans for their gym" ON public.subscription_plans;

-- Create new RLS policies for subscription plans
CREATE POLICY "Gym owners can create plans for their gym" 
ON public.subscription_plans 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = get_user_gym_id(auth.uid())
);

CREATE POLICY "Gym owners can update plans for their gym" 
ON public.subscription_plans 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = get_user_gym_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = get_user_gym_id(auth.uid())
);

CREATE POLICY "Gym owners can view plans for their gym" 
ON public.subscription_plans 
FOR SELECT 
USING (
  (gym_id IS NULL) OR -- Global plans visible to all
  (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = get_user_gym_id(auth.uid()))
);