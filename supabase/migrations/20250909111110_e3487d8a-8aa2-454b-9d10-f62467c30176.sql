-- Fix the RLS policy for profiles to work correctly with gym owners
DROP POLICY IF EXISTS "Gym owners can view gym member profiles" ON public.profiles;

-- Create a more robust policy that uses a direct subquery instead of complex joins
CREATE POLICY "Gym owners can view gym member profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM public.user_gym_memberships ugm
    WHERE ugm.user_id = profiles.user_id
      AND ugm.gym_id = ANY(get_user_owned_gyms(auth.uid()))
      AND ugm.status = 'active'
  )
);

-- Also ensure super instructors can view profiles in their gyms
CREATE POLICY "Super instructors can view gym member profiles" ON public.profiles
FOR SELECT USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_has_owner_privileges(auth.uid())
  AND EXISTS (
    SELECT 1 
    FROM public.user_gym_memberships ugm
    WHERE ugm.user_id = profiles.user_id
      AND ugm.gym_id = get_user_gym_id(auth.uid())
      AND ugm.status = 'active'
  )
);