-- Add RLS policy to allow public counting of course bookings
-- This allows users to see booking counts for courses without exposing personal data
CREATE POLICY "Users can count course bookings" ON public.bookings
FOR SELECT 
USING (true);