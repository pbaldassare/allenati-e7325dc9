-- Allow authenticated users to view instructors
-- This fixes the issue where basic users cannot see instructor names in course sessions
CREATE POLICY "Authenticated users can view instructors"
ON public.instructors
FOR SELECT
TO authenticated
USING (true);