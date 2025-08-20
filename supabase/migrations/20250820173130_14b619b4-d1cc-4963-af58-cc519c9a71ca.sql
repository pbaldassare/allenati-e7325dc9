-- Create policy to allow users to view limited profile data of participants in the same courses
CREATE POLICY "Users can view names of course participants" 
ON public.profiles 
FOR SELECT 
USING (
  user_id IN (
    SELECT DISTINCT b.user_id
    FROM public.bookings b
    WHERE b.course_id IN (
      SELECT DISTINCT b2.course_id
      FROM public.bookings b2
      WHERE b2.user_id = auth.uid()
      AND b2.status = 'confirmed'
    )
    AND b.status = 'confirmed'
  )
);