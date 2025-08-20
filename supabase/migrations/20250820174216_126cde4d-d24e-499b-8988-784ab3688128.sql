-- Drop the existing policy and recreate it with the correct permissions
DROP POLICY IF EXISTS "Authenticated users can view course participants" ON public.profiles;

-- Create the updated policy that allows all authenticated users to see basic profile info of course participants
CREATE POLICY "Authenticated users can view course participants" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  user_id IN (
    SELECT DISTINCT b.user_id
    FROM public.bookings b
    WHERE b.status = 'confirmed'
  )
);