UPDATE public.gym_applications 
SET status = 'pending' 
WHERE applicant_email = 'palestrademo@gmail.com' 
AND status = 'approved';