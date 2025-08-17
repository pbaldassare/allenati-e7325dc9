-- Create gym_join_requests table for managing user requests to join gyms
CREATE TABLE public.gym_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, gym_id)
);

-- Enable RLS
ALTER TABLE public.gym_join_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for gym join requests
CREATE POLICY "Users can create their own requests" ON public.gym_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests" ON public.gym_join_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Gym owners can view requests for their gym" ON public.gym_join_requests
  FOR SELECT USING (
    has_role(auth.uid(), 'gym_owner'::app_role) AND 
    gym_id = get_user_gym_id(auth.uid())
  );

CREATE POLICY "Gym owners can update requests for their gym" ON public.gym_join_requests
  FOR UPDATE USING (
    has_role(auth.uid(), 'gym_owner'::app_role) AND 
    gym_id = get_user_gym_id(auth.uid())
  );

CREATE POLICY "Admins can manage all requests" ON public.gym_join_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updating timestamp
CREATE TRIGGER update_gym_join_requests_updated_at
  BEFORE UPDATE ON public.gym_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();