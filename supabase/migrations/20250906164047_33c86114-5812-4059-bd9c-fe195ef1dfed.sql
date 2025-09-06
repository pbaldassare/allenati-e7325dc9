-- Update RLS policies for user_gym_memberships table to support multi-gym owners

-- Drop existing policies
DROP POLICY IF EXISTS "Gym owners can add memberships for their gym" ON public.user_gym_memberships;
DROP POLICY IF EXISTS "Gym owners can update memberships for their gym" ON public.user_gym_memberships;
DROP POLICY IF EXISTS "Gym owners can view memberships for their gym" ON public.user_gym_memberships;

-- Create new policies that support multiple gym ownership
CREATE POLICY "Gym owners can add memberships for their gym" 
ON public.user_gym_memberships 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND 
   gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR 
  (has_role(auth.uid(), 'instructor'::app_role) AND 
   instructor_has_owner_privileges(auth.uid()) AND 
   gym_id = get_user_gym_id(auth.uid()))
);

CREATE POLICY "Gym owners can update memberships for their gym" 
ON public.user_gym_memberships 
FOR UPDATE 
USING (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND 
   gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR 
  (has_role(auth.uid(), 'instructor'::app_role) AND 
   instructor_has_owner_privileges(auth.uid()) AND 
   gym_id = get_user_gym_id(auth.uid()))
)
WITH CHECK (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND 
   gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR 
  (has_role(auth.uid(), 'instructor'::app_role) AND 
   instructor_has_owner_privileges(auth.uid()) AND 
   gym_id = get_user_gym_id(auth.uid()))
);

CREATE POLICY "Gym owners can view memberships for their gym" 
ON public.user_gym_memberships 
FOR SELECT 
USING (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND 
   gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR 
  (has_role(auth.uid(), 'instructor'::app_role) AND 
   instructor_has_owner_privileges(auth.uid()) AND 
   gym_id = get_user_gym_id(auth.uid()))
);

-- Update RLS policies for user_subscriptions table to support multi-gym owners
DROP POLICY IF EXISTS "Gym owners can view gym member subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Gym owners can create subscriptions for their gym members" ON public.user_subscriptions;

CREATE POLICY "Gym owners can view gym member subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND 
   gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR 
  (has_role(auth.uid(), 'instructor'::app_role) AND 
   instructor_has_owner_privileges(auth.uid()) AND 
   user_id IN (
     SELECT ugm.user_id 
     FROM user_gym_memberships ugm 
     WHERE ugm.gym_id = get_user_gym_id(auth.uid()) 
     AND ugm.status = 'active'
   ))
);

CREATE POLICY "Gym owners can create subscriptions for their gym members" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND 
   gym_id = ANY(get_user_owned_gyms(auth.uid()))) OR 
  (has_role(auth.uid(), 'instructor'::app_role) AND 
   instructor_has_owner_privileges(auth.uid()) AND 
   user_id IN (
     SELECT ugm.user_id 
     FROM user_gym_memberships ugm 
     WHERE ugm.gym_id = get_user_gym_id(auth.uid()) 
     AND ugm.status = 'active'
   ) AND gym_id = get_user_gym_id(auth.uid()))
);

-- Update RLS policies for credits_transactions table to support multi-gym owners
DROP POLICY IF EXISTS "Gym owners can view gym member credit transactions" ON public.credits_transactions;
DROP POLICY IF EXISTS "Gym owners can create credit transactions for their gym members" ON public.credits_transactions;

CREATE POLICY "Gym owners can view gym member credit transactions" 
ON public.credits_transactions 
FOR SELECT 
USING (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND 
   user_id IN (
     SELECT ugm.user_id 
     FROM user_gym_memberships ugm 
     WHERE ugm.gym_id = ANY(get_user_owned_gyms(auth.uid())) 
     AND ugm.status = 'active'
   )) OR 
  (has_role(auth.uid(), 'instructor'::app_role) AND 
   instructor_has_owner_privileges(auth.uid()) AND 
   user_id IN (
     SELECT ugm.user_id 
     FROM user_gym_memberships ugm 
     WHERE ugm.gym_id = get_user_gym_id(auth.uid()) 
     AND ugm.status = 'active'
   ))
);

CREATE POLICY "Gym owners can create credit transactions for their gym members" 
ON public.credits_transactions 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND 
   user_id IN (
     SELECT ugm.user_id 
     FROM user_gym_memberships ugm 
     WHERE ugm.gym_id = ANY(get_user_owned_gyms(auth.uid())) 
     AND ugm.status = 'active'
   )) OR 
  (has_role(auth.uid(), 'instructor'::app_role) AND 
   instructor_has_owner_privileges(auth.uid()) AND 
   user_id IN (
     SELECT ugm.user_id 
     FROM user_gym_memberships ugm 
     WHERE ugm.gym_id = get_user_gym_id(auth.uid()) 
     AND ugm.status = 'active'
   ))
);