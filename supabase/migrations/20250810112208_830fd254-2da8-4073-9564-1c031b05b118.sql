-- Create enum for certificate status first
CREATE TYPE medical_certificate_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Create storage bucket for medical certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-certificates', 'medical-certificates', false);

-- Create user gym memberships table to link users to gyms
CREATE TABLE public.user_gym_memberships (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    gym_id UUID NOT NULL,
    membership_type TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, gym_id)
);

-- Create medical certificates table
CREATE TABLE public.medical_certificates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    gym_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    status medical_certificate_status NOT NULL DEFAULT 'pending',
    issue_date DATE,
    expiry_date DATE,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on medical certificates
ALTER TABLE public.medical_certificates ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user gym memberships
ALTER TABLE public.user_gym_memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for medical certificates
-- Users can only see their own certificates
CREATE POLICY "Users can view their own certificates" 
ON public.medical_certificates 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own certificates
CREATE POLICY "Users can insert their own certificates" 
ON public.medical_certificates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own certificates (only certain fields)
CREATE POLICY "Users can update their own certificates" 
ON public.medical_certificates 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Gym owners can view certificates for their gym
CREATE POLICY "Gym owners can view certificates for their gym" 
ON public.medical_certificates 
FOR SELECT 
USING (
    has_role(auth.uid(), 'gym_owner') AND 
    gym_id = get_user_gym_id(auth.uid())
);

-- Gym owners can update certificate status and review info
CREATE POLICY "Gym owners can update certificate reviews" 
ON public.medical_certificates 
FOR UPDATE 
USING (
    has_role(auth.uid(), 'gym_owner') AND 
    gym_id = get_user_gym_id(auth.uid())
);

-- Admins can view all certificates
CREATE POLICY "Admins can view all certificates" 
ON public.medical_certificates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for user gym memberships
-- Users can view their own memberships
CREATE POLICY "Users can view their own memberships" 
ON public.user_gym_memberships 
FOR SELECT 
USING (auth.uid() = user_id);

-- Gym owners can view memberships for their gym
CREATE POLICY "Gym owners can view memberships for their gym" 
ON public.user_gym_memberships 
FOR SELECT 
USING (
    has_role(auth.uid(), 'gym_owner') AND 
    gym_id = get_user_gym_id(auth.uid())
);

-- Admins can manage all memberships
CREATE POLICY "Admins can manage all memberships" 
ON public.user_gym_memberships 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Storage policies for medical certificates
-- Users can upload their own certificates
CREATE POLICY "Users can upload their own certificates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'medical-certificates' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own certificates
CREATE POLICY "Users can view their own certificates" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'medical-certificates' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Gym owners can view certificates for their gym users
CREATE POLICY "Gym owners can view certificates for their gym users" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'medical-certificates' AND 
    has_role(auth.uid(), 'gym_owner') AND
    EXISTS (
        SELECT 1 FROM public.user_gym_memberships ugm 
        WHERE ugm.user_id::text = (storage.foldername(name))[1] 
        AND ugm.gym_id = get_user_gym_id(auth.uid())
        AND ugm.status = 'active'
    )
);

-- Admins can view all certificates
CREATE POLICY "Admins can view all certificates in storage" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'medical-certificates' AND 
    has_role(auth.uid(), 'admin')
);

-- Add triggers for updated_at
CREATE TRIGGER update_medical_certificates_updated_at
    BEFORE UPDATE ON public.medical_certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_gym_memberships_updated_at
    BEFORE UPDATE ON public.user_gym_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();