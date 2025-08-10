-- Update get_user_gym_id function to support regular users with memberships
CREATE OR REPLACE FUNCTION public.get_user_gym_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  -- First check user_gym_memberships for regular users
  SELECT gym_id
  FROM public.user_gym_memberships
  WHERE user_id = _user_id 
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1
  
  UNION
  
  -- Fallback to instructors table for instructor users
  SELECT gym_id
  FROM public.instructors
  WHERE user_id = _user_id
  LIMIT 1
$function$;

-- Create storage policies for medical-certificates bucket
-- Allow users to insert their own certificates
CREATE POLICY "Users can upload their own certificates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'medical-certificates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to select their own certificates
CREATE POLICY "Users can view their own certificates" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'medical-certificates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all certificates
CREATE POLICY "Admins can view all certificates" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'medical-certificates' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow gym owners to view certificates for their gym
CREATE POLICY "Gym owners can view gym certificates" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'medical-certificates' 
  AND has_role(auth.uid(), 'gym_owner'::app_role)
  AND get_user_gym_id(auth.uid()) IS NOT NULL
);