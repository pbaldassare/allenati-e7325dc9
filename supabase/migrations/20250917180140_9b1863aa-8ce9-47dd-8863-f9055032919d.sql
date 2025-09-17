-- Add RLS policy for super instructors to update bookings in their gym
CREATE POLICY "Super instructors can update their gym bookings" 
ON public.bookings 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_has_owner_privileges_for_gym(auth.uid(), (
    SELECT c.gym_id 
    FROM courses c 
    WHERE c.id = course_id
  ))
);