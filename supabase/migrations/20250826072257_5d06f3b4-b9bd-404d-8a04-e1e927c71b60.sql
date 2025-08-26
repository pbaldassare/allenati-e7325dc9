-- Extend gyms table with Stripe Connect fields
ALTER TABLE public.gyms 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_dashboard_url TEXT;

-- Create index for Stripe Connect account lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_gyms_stripe_connect_account_id ON public.gyms(stripe_connect_account_id);