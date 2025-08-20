-- Create new RLS policy to allow viewing confirmed bookings for participant display
CREATE POLICY "Authenticated users can view confirmed bookings for participant display" 
ON public.bookings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  status = 'confirmed'::booking_status
);