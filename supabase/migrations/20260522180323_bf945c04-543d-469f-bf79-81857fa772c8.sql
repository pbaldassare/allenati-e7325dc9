DROP POLICY IF EXISTS "Gym owners can view their gym" ON public.gyms;
DROP POLICY IF EXISTS "Gym owners can update their gym" ON public.gyms;

CREATE POLICY "Gym owners can view their gym"
ON public.gyms
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND (id = get_user_gym_id(auth.uid())))
  OR (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges(auth.uid()) AND (id = get_user_gym_id(auth.uid())))
);

CREATE POLICY "Gym owners can update their gym"
ON public.gyms
FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND (id = get_user_gym_id(auth.uid())))
  OR (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges(auth.uid()) AND (id = get_user_gym_id(auth.uid())))
)
WITH CHECK (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND (id = get_user_gym_id(auth.uid())))
  OR (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges(auth.uid()) AND (id = get_user_gym_id(auth.uid())))
);