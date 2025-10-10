-- Drop existing policy that blocks multi-gym updates
DROP POLICY IF EXISTS "Gym owners can update their gym member credits" ON public.gym_credits;

-- Create new policy with multi-gym support for all operations
CREATE POLICY "Gym owners can manage their gym member credits"
ON public.gym_credits 
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
);