-- Update RLS policy for course_sessions to allow gym owners to manage sessions in all their owned gyms
DROP POLICY IF EXISTS "Gym owners can manage their gym course sessions" ON public.course_sessions;

CREATE POLICY "Gym owners can manage their gym course sessions" 
ON public.course_sessions 
FOR ALL 
TO authenticated 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  (course_id IN (
    SELECT courses.id
    FROM courses
    WHERE courses.gym_id = ANY(get_user_owned_gyms(auth.uid()))
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  (course_id IN (
    SELECT courses.id
    FROM courses
    WHERE courses.gym_id = ANY(get_user_owned_gyms(auth.uid()))
  ))
);