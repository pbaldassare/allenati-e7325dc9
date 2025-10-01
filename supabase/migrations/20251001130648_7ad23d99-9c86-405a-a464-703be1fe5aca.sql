-- Add columns to track terms and privacy acceptance
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS terms_version text DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS privacy_version text DEFAULT '1.0';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted ON public.profiles(terms_accepted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_accepted ON public.profiles(privacy_accepted_at);

COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp when user accepted terms and conditions';
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS 'Timestamp when user accepted privacy policy';
COMMENT ON COLUMN public.profiles.terms_version IS 'Version of terms accepted by user';
COMMENT ON COLUMN public.profiles.privacy_version IS 'Version of privacy policy accepted by user';