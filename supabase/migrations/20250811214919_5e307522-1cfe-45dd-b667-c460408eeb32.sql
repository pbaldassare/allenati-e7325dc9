-- Create gym applications table for gym owner candidatures
CREATE TABLE public.gym_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_user_id UUID NOT NULL,
  gym_name TEXT NOT NULL,
  gym_description TEXT,
  gym_address TEXT NOT NULL,
  gym_city TEXT NOT NULL,
  gym_postal_code TEXT,
  gym_phone TEXT,
  gym_email TEXT,
  gym_website TEXT,
  applicant_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gym_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for gym applications
CREATE POLICY "Users can view their own applications" 
ON public.gym_applications 
FOR SELECT 
USING (auth.uid() = applicant_user_id);

CREATE POLICY "Users can create their own applications" 
ON public.gym_applications 
FOR INSERT 
WITH CHECK (auth.uid() = applicant_user_id);

CREATE POLICY "Admins can manage all applications" 
ON public.gym_applications 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_gym_applications_updated_at
BEFORE UPDATE ON public.gym_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update user_gym_memberships to be mandatory for users
-- Remove the nullable constraint from gym_id in user_gym_memberships if it exists
-- and ensure every user has a gym membership