-- Add policy to allow gym owners to create subscriptions for their gym members
CREATE POLICY "Gym owners can create subscriptions for their gym members" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  user_id IN (
    SELECT ugm.user_id
    FROM public.user_gym_memberships ugm
    WHERE ugm.gym_id = get_user_gym_id(auth.uid()) 
    AND ugm.status = 'active'
  ) AND
  gym_id = get_user_gym_id(auth.uid())
);