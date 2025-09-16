-- Check existing policies and update user_gym_memberships policies for super instructors
DROP POLICY IF EXISTS "Super instructors can manage gym memberships" ON public.user_gym_memberships;
DROP POLICY IF EXISTS "Gym owners can add memberships for their gyms" ON public.user_gym_memberships;
DROP POLICY IF EXISTS "Gym owners can update memberships for their gyms" ON public.user_gym_memberships;
DROP POLICY IF EXISTS "Gym owners can view memberships for their gyms" ON public.user_gym_memberships;

-- Create comprehensive policy for all membership operations
CREATE POLICY "Gym owners and super instructors can manage memberships" ON public.user_gym_memberships
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

-- Update profiles policies for super instructors
DROP POLICY IF EXISTS "Super instructors can view gym member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super instructors can update gym member profiles" ON public.profiles;

CREATE POLICY "Super instructors can view gym member profiles" ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() = user_id OR
  (has_role(auth.uid(), 'gym_owner'::app_role) AND user_id IN (
    SELECT ugm.user_id FROM public.user_gym_memberships ugm 
    WHERE ugm.gym_id = ANY(get_user_owned_gyms(auth.uid())) AND ugm.status = 'active'
  )) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND user_id IN (
    SELECT ugm.user_id FROM public.user_gym_memberships ugm
    WHERE ugm.status = 'active' AND instructor_has_owner_privileges_for_gym(auth.uid(), ugm.gym_id)
  ))
);

CREATE POLICY "Super instructors can update gym member profiles" ON public.profiles  
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() = user_id OR
  (has_role(auth.uid(), 'gym_owner'::app_role) AND user_id IN (
    SELECT ugm.user_id FROM public.user_gym_memberships ugm 
    WHERE ugm.gym_id = ANY(get_user_owned_gyms(auth.uid())) AND ugm.status = 'active'
  )) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND user_id IN (
    SELECT ugm.user_id FROM public.user_gym_memberships ugm
    WHERE ugm.status = 'active' AND instructor_has_owner_privileges_for_gym(auth.uid(), ugm.gym_id)
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() = user_id OR
  (has_role(auth.uid(), 'gym_owner'::app_role) AND user_id IN (
    SELECT ugm.user_id FROM public.user_gym_memberships ugm 
    WHERE ugm.gym_id = ANY(get_user_owned_gyms(auth.uid())) AND ugm.status = 'active'
  )) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND user_id IN (
    SELECT ugm.user_id FROM public.user_gym_memberships ugm
    WHERE ugm.status = 'active' AND instructor_has_owner_privileges_for_gym(auth.uid(), ugm.gym_id)
  ))
);