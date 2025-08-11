-- Add a test gym for development
INSERT INTO public.gyms (name, city, address, phone, email, description) 
VALUES (
  'Palestra Test', 
  'Milano', 
  'Via Test 123', 
  '+39 333 1234567', 
  'test@palestratest.com',
  'Palestra di test per lo sviluppo dell''applicazione'
) ON CONFLICT DO NOTHING;

-- Add email field to gym_applications table to allow applications without authentication
ALTER TABLE public.gym_applications 
ADD COLUMN IF NOT EXISTS applicant_email TEXT;

-- Modify the applicant_user_id column to be nullable to allow applications without authentication
ALTER TABLE public.gym_applications 
ALTER COLUMN applicant_user_id DROP NOT NULL;

-- Add constraint to ensure either applicant_user_id OR applicant_email is provided
ALTER TABLE public.gym_applications 
ADD CONSTRAINT check_applicant_identification 
CHECK (
  (applicant_user_id IS NOT NULL AND applicant_email IS NULL) OR 
  (applicant_user_id IS NULL AND applicant_email IS NOT NULL)
);