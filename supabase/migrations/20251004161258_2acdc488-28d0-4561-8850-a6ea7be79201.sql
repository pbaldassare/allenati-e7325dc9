-- Create subscription_history table to track all subscription changes
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  status subscription_status NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE,
  renewed_at TIMESTAMP WITH TIME ZONE,
  renewed_by UUID,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_subscription_history_user_id ON public.subscription_history(user_id);
CREATE INDEX idx_subscription_history_gym_id ON public.subscription_history(gym_id);
CREATE INDEX idx_subscription_history_subscription_id ON public.subscription_history(subscription_id);

-- Enable RLS
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_history
CREATE POLICY "Admins can view all subscription history"
ON public.subscription_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gym owners can view their gym subscription history"
ON public.subscription_history
FOR SELECT
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

CREATE POLICY "Super instructors can view their gym subscription history"
ON public.subscription_history
FOR SELECT
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id)
);

CREATE POLICY "Users can view their own subscription history"
ON public.subscription_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Gym owners and super instructors can insert subscription history"
ON public.subscription_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = ANY(get_user_owned_gyms(auth.uid())))
  OR (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id))
);