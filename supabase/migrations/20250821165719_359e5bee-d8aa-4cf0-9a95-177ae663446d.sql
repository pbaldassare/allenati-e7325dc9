-- Create policy to allow gym owners to upload gym logos
CREATE POLICY "Gym owners can upload gym logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'gym_owner'::app_role)
  AND (storage.foldername(name))[1] = 'gym-logos'
);

-- Create policy to allow gym owners to update gym logos
CREATE POLICY "Gym owners can update gym logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND has_role(auth.uid(), 'gym_owner'::app_role)
  AND (storage.foldername(name))[1] = 'gym-logos'
);