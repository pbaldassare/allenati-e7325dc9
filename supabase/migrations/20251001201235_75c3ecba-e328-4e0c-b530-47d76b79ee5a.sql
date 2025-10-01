-- Create gym_documents table for generic documents
CREATE TABLE public.gym_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT
);

-- Enable RLS
ALTER TABLE public.gym_documents ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for gym documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gym-documents',
  'gym-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.ms-excel']
);

-- RLS Policies for gym_documents table
CREATE POLICY "Gym owners can manage their gym documents"
ON public.gym_documents
FOR ALL
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

CREATE POLICY "Super instructors can manage gym documents"
ON public.gym_documents
FOR ALL
USING (
  has_role(auth.uid(), 'instructor'::app_role)
  AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id)
)
WITH CHECK (
  has_role(auth.uid(), 'instructor'::app_role)
  AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id)
);

CREATE POLICY "Admins can manage all gym documents"
ON public.gym_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gym members can view their gym documents"
ON public.gym_documents
FOR SELECT
USING (
  is_active = true
  AND gym_id IN (
    SELECT gym_id FROM public.user_gym_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Storage RLS Policies for gym-documents bucket
CREATE POLICY "Gym owners can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'gym-documents'
  AND (
    has_role(auth.uid(), 'gym_owner'::app_role)
    OR (has_role(auth.uid(), 'instructor'::app_role) AND is_backoffice_user(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Gym owners can update their documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'gym-documents'
  AND (
    has_role(auth.uid(), 'gym_owner'::app_role)
    OR (has_role(auth.uid(), 'instructor'::app_role) AND is_backoffice_user(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Gym owners can delete their documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'gym-documents'
  AND (
    has_role(auth.uid(), 'gym_owner'::app_role)
    OR (has_role(auth.uid(), 'instructor'::app_role) AND is_backoffice_user(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Gym members can view documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'gym-documents'
  AND auth.uid() IS NOT NULL
);

-- Create indexes
CREATE INDEX idx_gym_documents_gym_id ON public.gym_documents(gym_id);
CREATE INDEX idx_gym_documents_category ON public.gym_documents(category);
CREATE INDEX idx_gym_documents_active ON public.gym_documents(is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_gym_documents_updated_at
BEFORE UPDATE ON public.gym_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();