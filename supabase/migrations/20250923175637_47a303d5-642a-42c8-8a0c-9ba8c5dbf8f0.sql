-- Fix duplicate credits for provacharme user
-- Set credits to 1 for user provacharme@gmail.com at Charme gym

UPDATE public.gym_credits 
SET credits = 1, 
    updated_at = now()
WHERE user_id = (
  SELECT user_id 
  FROM public.profiles 
  WHERE email = 'provacharme@gmail.com'
) 
AND gym_id = (
  SELECT id 
  FROM public.gyms 
  WHERE name = 'Charme'
);