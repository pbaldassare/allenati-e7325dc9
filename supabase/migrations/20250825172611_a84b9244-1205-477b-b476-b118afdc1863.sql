-- Add first_name and last_name columns to instructors table
ALTER TABLE public.instructors 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Populate the new columns with existing data from profiles
UPDATE public.instructors 
SET 
  first_name = p.first_name,
  last_name = p.last_name
FROM public.profiles p
WHERE public.instructors.user_id = p.user_id;

-- Create function to sync instructor names when profiles are updated
CREATE OR REPLACE FUNCTION public.sync_instructor_names()
RETURNS TRIGGER AS $$
BEGIN
  -- Update instructor names when profile is updated
  UPDATE public.instructors 
  SET 
    first_name = NEW.first_name,
    last_name = NEW.last_name
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync names
CREATE TRIGGER sync_instructor_names_trigger
  AFTER UPDATE OF first_name, last_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_instructor_names();

-- Also sync when a new instructor is created and has an existing profile
CREATE OR REPLACE FUNCTION public.sync_new_instructor_names()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new instructor is created, get their name from profiles
  UPDATE public.instructors 
  SET 
    first_name = p.first_name,
    last_name = p.last_name
  FROM public.profiles p
  WHERE public.instructors.id = NEW.id 
    AND public.instructors.user_id = p.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new instructors
CREATE TRIGGER sync_new_instructor_names_trigger
  AFTER INSERT ON public.instructors
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_new_instructor_names();