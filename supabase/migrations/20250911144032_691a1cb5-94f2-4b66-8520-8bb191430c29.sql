-- Add RLS policies for Super Instructors to view gym member data

-- Policy for user_gym_memberships - Super instructors can view memberships in their gym
CREATE POLICY "Super instructors can view gym memberships"
ON public.user_gym_memberships
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_has_owner_privileges(auth.uid()) 
  AND gym_id = get_user_gym_id(auth.uid())
);

-- Policy for user_roles - Super instructors can view roles of their gym members
CREATE POLICY "Super instructors can view gym member roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_has_owner_privileges(auth.uid())
  AND user_id IN (
    SELECT ugm.user_id 
    FROM public.user_gym_memberships ugm 
    WHERE ugm.gym_id = get_user_gym_id(auth.uid()) 
    AND ugm.status = 'active'
  )
);

-- Policy for medical_certificates - Super instructors can view certificates in their gym
CREATE POLICY "Super instructors can view gym member certificates"
ON public.medical_certificates
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_has_owner_privileges(auth.uid())
  AND gym_id = get_user_gym_id(auth.uid())
);