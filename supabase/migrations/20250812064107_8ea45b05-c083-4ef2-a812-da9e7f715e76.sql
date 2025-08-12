-- Fix RLS policy for gym_applications table
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can insert gym applications" ON public.gym_applications;

-- Create a proper RLS policy that allows:
-- 1. Authenticated users to insert with their user_id
-- 2. Anonymous users to insert with NULL user_id but required email
CREATE POLICY "Allow gym application submissions"
ON public.gym_applications
FOR INSERT
WITH CHECK (
  (
    -- Case 1: Authenticated user
    auth.uid() IS NOT NULL 
    AND applicant_user_id = auth.uid() 
    AND applicant_email IS NOT NULL
    AND applicant_email != ''
  )
  OR
  (
    -- Case 2: Anonymous user (no auth.uid())
    auth.uid() IS NULL 
    AND applicant_user_id IS NULL 
    AND applicant_email IS NOT NULL
    AND applicant_email != ''
  )
);

-- Also allow users to read their own applications
CREATE POLICY "Users can view their own gym applications"
ON public.gym_applications
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND applicant_user_id = auth.uid())
  OR 
  (auth.uid() IS NULL AND applicant_user_id IS NULL)
);