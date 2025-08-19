-- Add foreign key constraint between instructors.user_id and profiles.user_id
-- This will allow PostgREST to automatically join these tables
ALTER TABLE public.instructors 
ADD CONSTRAINT instructors_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;