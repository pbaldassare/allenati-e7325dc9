-- Extend gyms table with Stripe Connect fields
ALTER TABLE public.gyms 
ADD COLUMN stripe_connect_account_id TEXT,
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_dashboard_url TEXT;

-- Create index for Stripe Connect account lookups
CREATE INDEX idx_gyms_stripe_connect_account_id ON public.gyms(stripe_connect_account_id);

-- Create admin action logs table for tracking Stripe Connect actions
CREATE TABLE public.admin_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'gym', 'user', etc.
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin action logs
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin action logs
CREATE POLICY "Admins can manage action logs" 
ON public.admin_action_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updating gyms timestamp
CREATE TRIGGER update_gyms_updated_at
BEFORE UPDATE ON public.gyms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();