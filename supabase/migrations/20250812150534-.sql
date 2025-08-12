-- Reset palestrademo gym application status to pending for re-approval
UPDATE public.gym_applications 
SET status = 'pending'
WHERE applicant_email = 'palestrademo@gmail.com' 
  AND gym_name = 'palestrademo'
  AND status = 'approved';