CREATE POLICY "Users can view courses they booked"
ON public.courses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.course_id = courses.id
      AND b.user_id = auth.uid()
  )
);