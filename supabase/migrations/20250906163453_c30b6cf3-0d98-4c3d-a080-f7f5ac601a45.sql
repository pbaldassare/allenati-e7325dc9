-- Update RLS policies for instructors table to support multi-gym owners

-- Drop existing policies
DROP POLICY IF EXISTS "Gym owners can view their gym instructors" ON public.instructors;
DROP POLICY IF EXISTS "Gym owners can manage their instructors" ON public.instructors;

-- Create new policies that support multiple gym ownership
CREATE POLICY "Gym owners can view their gym instructors" 
ON public.instructors 
FOR SELECT 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

CREATE POLICY "Gym owners can manage their instructors" 
ON public.instructors 
FOR ALL 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
);