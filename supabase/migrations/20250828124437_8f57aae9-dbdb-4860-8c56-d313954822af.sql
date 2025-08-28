-- Add RLS policy to allow gym owners to update their gym data
CREATE POLICY "Gym owners can update their gym" ON public.gyms
FOR UPDATE
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND (id = get_user_gym_id(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'gym_owner'::app_role) AND (id = get_user_gym_id(auth.uid())));