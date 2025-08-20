-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view names of course participants" ON public.profiles;

-- Create a new policy that allows all authenticated users to see basic profile info of course participants
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