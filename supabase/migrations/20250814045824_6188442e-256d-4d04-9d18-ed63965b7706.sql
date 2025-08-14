-- Fix existing users credit system
-- 1. Give welcome credits to existing users who have 0 credits
INSERT INTO public.credits_transactions (user_id, amount, balance_after, transaction_type, description)
SELECT 
  p.user_id,
  1 as amount,
  1 as balance_after,
  'welcome_bonus' as transaction_type,
  'Credito di benvenuto retroattivo' as description
FROM public.profiles p
WHERE p.current_credits = 0
  AND NOT EXISTS (
    SELECT 1 FROM public.credits_transactions ct 
    WHERE ct.user_id = p.user_id 
      AND ct.transaction_type = 'welcome_bonus'
  );

-- 2. Update current_credits for existing users with 0 credits
UPDATE public.profiles 
SET current_credits = 1
WHERE current_credits = 0
  AND EXISTS (
    SELECT 1 FROM public.credits_transactions ct 
    WHERE ct.user_id = profiles.user_id 
      AND ct.transaction_type = 'welcome_bonus'
  );

-- 3. Calculate correct credit balance for users with existing bookings
-- For each user, calculate their correct balance based on transactions
WITH user_balances AS (
  SELECT 
    user_id,
    COALESCE(SUM(amount), 0) as calculated_balance
  FROM public.credits_transactions
  GROUP BY user_id
)
UPDATE public.profiles
SET current_credits = ub.calculated_balance
FROM user_balances ub
WHERE profiles.user_id = ub.user_id
  AND profiles.current_credits != ub.calculated_balance;

-- 4. Create booking transactions for existing confirmed bookings that don't have corresponding transactions
INSERT INTO public.credits_transactions (user_id, amount, balance_after, transaction_type, description, reference_id, created_at)
SELECT 
  b.user_id,
  -b.credits_used as amount,
  p.current_credits - b.credits_used as balance_after,
  'booking' as transaction_type,
  'Prenotazione corso esistente' as description,
  b.id as reference_id,
  b.created_at
FROM public.bookings b
JOIN public.profiles p ON b.user_id = p.user_id
WHERE b.status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1 FROM public.credits_transactions ct 
    WHERE ct.reference_id = b.id 
      AND ct.transaction_type = 'booking'
  );

-- 5. Recalculate all user balances after adding missing transactions
WITH user_final_balances AS (
  SELECT 
    user_id,
    COALESCE(SUM(amount), 0) as final_balance
  FROM public.credits_transactions
  GROUP BY user_id
)
UPDATE public.profiles
SET current_credits = ufb.final_balance
FROM user_final_balances ufb
WHERE profiles.user_id = ufb.user_id;