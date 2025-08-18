-- Fix instructor profile with missing names
UPDATE public.profiles 
SET 
  first_name = 'Istruttore',
  last_name = 'Non Assegnato'
WHERE user_id = '2574a75a-427d-4edb-b56d-63d66247a30c' 
  AND (first_name IS NULL OR last_name IS NULL);

-- Ensure all instructor profiles have proper names
UPDATE public.profiles 
SET 
  first_name = COALESCE(first_name, 'Istruttore'),
  last_name = COALESCE(last_name, 'Non Assegnato')
WHERE user_id IN (
  SELECT DISTINCT user_id 
  FROM public.instructors 
  WHERE is_active = true
) AND (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '');