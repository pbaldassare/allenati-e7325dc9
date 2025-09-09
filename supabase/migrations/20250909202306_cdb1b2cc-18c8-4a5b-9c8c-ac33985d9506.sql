-- Add policy to allow authenticated users to view confirmed bookings for session participants
CREATE POLICY "Authenticated users can view confirmed bookings for participants" 
ON public.bookings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND status = 'confirmed'
);