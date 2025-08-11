-- Drop existing restrictive policy for gym applications INSERT
DROP POLICY IF EXISTS "Users can create their own applications" ON public.gym_applications;

-- Create new policy that allows applications from both authenticated and unauthenticated users
CREATE POLICY "Anyone can create gym applications" 
ON public.gym_applications 
FOR INSERT 
WITH CHECK (
  -- Allow if user is authenticated and matches applicant_user_id
  (auth.uid() IS NOT NULL AND auth.uid() = applicant_user_id) 
  OR 
  -- Allow if user is not authenticated but provides email
  (auth.uid() IS NULL AND applicant_user_id IS NULL AND applicant_email IS NOT NULL)
);

-- Update the SELECT policy to allow unauthenticated users to view their applications by email
DROP POLICY IF EXISTS "Users can view their own applications" ON public.gym_applications;

CREATE POLICY "Users can view applications" 
ON public.gym_applications 
FOR SELECT 
USING (
  -- Authenticated users can see their own applications
  (auth.uid() IS NOT NULL AND auth.uid() = applicant_user_id)
  OR
  -- Admins can see all applications (this will be covered by existing admin policy)
  has_role(auth.uid(), 'admin'::app_role)
);