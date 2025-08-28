-- Remove Stripe Connect columns and add independent Stripe credentials
ALTER TABLE public.gyms 
DROP COLUMN IF EXISTS stripe_connect_account_id,
DROP COLUMN IF EXISTS stripe_onboarding_complete,
DROP COLUMN IF EXISTS stripe_charges_enabled,
DROP COLUMN IF EXISTS stripe_payouts_enabled,
DROP COLUMN IF EXISTS stripe_dashboard_url;

-- Add independent Stripe credentials columns
ALTER TABLE public.gyms 
ADD COLUMN stripe_secret_key TEXT,
ADD COLUMN stripe_publishable_key TEXT,
ADD COLUMN stripe_credentials_configured BOOLEAN DEFAULT FALSE;