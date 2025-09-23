-- Fix missing gym credits for users who received welcome bonus
-- but don't have corresponding gym_credits records

-- Insert missing gym_credits record for provacharme@gmail.com
INSERT INTO public.gym_credits (user_id, gym_id, credits)
SELECT 
  p.user_id,
  ugm.gym_id,
  1 as credits
FROM public.profiles p
JOIN public.user_gym_memberships ugm ON p.user_id = ugm.user_id
WHERE p.email = 'provacharme@gmail.com'
  AND ugm.status = 'active'
  AND p.user_id IN (
    SELECT user_id 
    FROM public.credits_transactions 
    WHERE transaction_type = 'welcome_bonus'
  )
  AND NOT EXISTS (
    SELECT 1 
    FROM public.gym_credits gc 
    WHERE gc.user_id = p.user_id 
    AND gc.gym_id = ugm.gym_id
  )
ON CONFLICT (user_id, gym_id) DO NOTHING;

-- Update current_credits field for compatibility
UPDATE public.profiles 
SET current_credits = 1
WHERE email = 'provacharme@gmail.com' 
AND current_credits != 1;