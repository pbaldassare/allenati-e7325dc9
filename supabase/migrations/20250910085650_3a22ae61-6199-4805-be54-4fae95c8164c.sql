-- Fix RLS policies for gym_rooms to work with multiple owned gyms
-- Drop existing policies first
DROP POLICY IF EXISTS "Gym owners can manage their gym rooms" ON public.gym_rooms;

-- Create new policy that allows owners to manage rooms in ALL their owned gyms
CREATE POLICY "Gym owners can manage their gym rooms" 
ON public.gym_rooms 
FOR ALL 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = ANY(get_user_owned_gyms(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = ANY(get_user_owned_gyms(auth.uid())));