DROP POLICY IF EXISTS "Admins can manage all categories" ON public.course_categories;
DROP POLICY IF EXISTS "Gym owners can manage their gym categories" ON public.course_categories;

CREATE POLICY "Admins can manage all categories"
ON public.course_categories
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gym owners can manage their gym categories"
ON public.course_categories
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'gym_owner'::app_role)
  AND gym_id = ANY (get_user_owned_gyms(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role)
  AND gym_id = ANY (get_user_owned_gyms(auth.uid()))
);

DROP POLICY IF EXISTS "Admins can manage all main categories" ON public.main_categories;
DROP POLICY IF EXISTS "Gym owners can manage main categories" ON public.main_categories;

CREATE POLICY "Admins can manage all main categories"
ON public.main_categories
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gym owners can manage main categories"
ON public.main_categories
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gym_owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'gym_owner'::app_role));