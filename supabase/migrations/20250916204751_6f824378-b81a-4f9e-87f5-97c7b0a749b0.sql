-- Drop existing policies for subscription_plans to recreate them with super instructor support
DROP POLICY IF EXISTS "Gym owners can create plans for their gyms" ON public.subscription_plans;
DROP POLICY IF EXISTS "Gym owners can update plans for their gyms" ON public.subscription_plans;
DROP POLICY IF EXISTS "Gym owners can delete plans for their gyms" ON public.subscription_plans;
DROP POLICY IF EXISTS "Gym owners can manage their subscription plans" ON public.subscription_plans;

-- Create comprehensive policy for all subscription plan operations
CREATE POLICY "Gym owners and super instructors can manage subscription plans" ON public.subscription_plans
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id))
);

-- Update user_subscriptions policies for super instructors
DROP POLICY IF EXISTS "Gym owners can create subscriptions for their gym members" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Gym owners can view gym member subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Gym owners can update gym member subscriptions" ON public.user_subscriptions;

CREATE POLICY "Gym owners and super instructors can manage user subscriptions" ON public.user_subscriptions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() = user_id OR
  (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() = user_id OR
  (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id))
);

-- Update credits_transactions policies for super instructors
DROP POLICY IF EXISTS "Gym owners can create credit transactions for their gym members" ON public.credits_transactions;
DROP POLICY IF EXISTS "Gym owners can view gym member credit transactions" ON public.credits_transactions;

CREATE POLICY "Gym owners and super instructors can manage credit transactions" ON public.credits_transactions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() = user_id OR
  (has_role(auth.uid(), 'gym_owner'::app_role) AND user_id IN (
    SELECT ugm.user_id FROM public.user_gym_memberships ugm 
    WHERE ugm.gym_id = ANY(get_user_owned_gyms(auth.uid())) AND ugm.status = 'active'
  )) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND gym_id IN (
    SELECT iga.gym_id FROM public.instructor_gym_assignments iga
    JOIN public.instructors i ON iga.instructor_id = i.id
    WHERE i.user_id = auth.uid() AND iga.has_owner_privileges = true AND iga.is_active = true
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() = user_id OR
  (has_role(auth.uid(), 'gym_owner'::app_role) AND user_id IN (
    SELECT ugm.user_id FROM public.user_gym_memberships ugm 
    WHERE ugm.gym_id = ANY(get_user_owned_gyms(auth.uid())) AND ugm.status = 'active'
  )) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND gym_id IN (
    SELECT iga.gym_id FROM public.instructor_gym_assignments iga
    JOIN public.instructors i ON iga.instructor_id = i.id
    WHERE i.user_id = auth.uid() AND iga.has_owner_privileges = true AND iga.is_active = true
  ))
);