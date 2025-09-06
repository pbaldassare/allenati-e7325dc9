-- Create function to get user owned gyms
CREATE OR REPLACE FUNCTION public.get_user_owned_gyms(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(DISTINCT gym_id)
  FROM public.user_gym_memberships
  WHERE user_id = _user_id 
    AND membership_type = 'owner'
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
$$;

-- Create additional gym requests table
CREATE TABLE public.additional_gym_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_user_id UUID NOT NULL,
  gym_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on additional gym requests
ALTER TABLE public.additional_gym_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for additional gym requests
CREATE POLICY "Users can create their own gym requests"
ON public.additional_gym_requests
FOR INSERT
WITH CHECK (auth.uid() = requester_user_id);

CREATE POLICY "Users can view their own gym requests"
ON public.additional_gym_requests
FOR SELECT
USING (auth.uid() = requester_user_id);

CREATE POLICY "Admins can manage all gym requests"
ON public.additional_gym_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Connect Fabio's gyms (Combat Lab and Charme)
-- First, get the Combat Lab user ID and Charme gym ID
DO $$
DECLARE
  combat_lab_user_id UUID;
  charme_gym_id UUID;
BEGIN
  -- Get Combat Lab user ID
  SELECT ugm.user_id INTO combat_lab_user_id
  FROM public.user_gym_memberships ugm
  JOIN public.gyms g ON ugm.gym_id = g.id
  WHERE g.name = 'Combat Lab'
    AND ugm.membership_type = 'owner'
    AND ugm.status = 'active'
  LIMIT 1;

  -- Get Charme gym ID
  SELECT id INTO charme_gym_id
  FROM public.gyms
  WHERE name = 'Charme'
  LIMIT 1;

  -- If both found, create the connection
  IF combat_lab_user_id IS NOT NULL AND charme_gym_id IS NOT NULL THEN
    -- Add Combat Lab user as owner of Charme gym
    INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
    VALUES (combat_lab_user_id, charme_gym_id, 'owner', 'active')
    ON CONFLICT (user_id, gym_id) DO UPDATE SET
      membership_type = 'owner',
      status = 'active',
      updated_at = now();
      
    RAISE NOTICE 'Connected Charme gym to Combat Lab user account';
  ELSE
    RAISE NOTICE 'Could not find Combat Lab user or Charme gym';
  END IF;
END;
$$;