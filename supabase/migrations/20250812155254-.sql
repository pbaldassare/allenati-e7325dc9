-- Rimuovere completamente palestrademo dal database

-- Prima eliminare i dati correlati per evitare violazioni di foreign key
DELETE FROM public.user_gym_memberships 
WHERE gym_id IN (
  SELECT id FROM public.gyms 
  WHERE owner_email = 'palestrademo@gmail.com' 
  OR email = 'palestrademo@gmail.com'
);

DELETE FROM public.course_categories 
WHERE gym_id IN (
  SELECT id FROM public.gyms 
  WHERE owner_email = 'palestrademo@gmail.com' 
  OR email = 'palestrademo@gmail.com'
);

DELETE FROM public.gym_rooms 
WHERE gym_id IN (
  SELECT id FROM public.gyms 
  WHERE owner_email = 'palestrademo@gmail.com' 
  OR email = 'palestrademo@gmail.com'
);

DELETE FROM public.instructors 
WHERE gym_id IN (
  SELECT id FROM public.gyms 
  WHERE owner_email = 'palestrademo@gmail.com' 
  OR email = 'palestrademo@gmail.com'
);

-- Eliminare le palestre palestrademo
DELETE FROM public.gyms 
WHERE owner_email = 'palestrademo@gmail.com' 
OR email = 'palestrademo@gmail.com';

-- Eliminare la candidatura palestrademo
DELETE FROM public.gym_applications 
WHERE applicant_email = 'palestrademo@gmail.com';

-- Commento: palestrademo completamente rimosso dal database