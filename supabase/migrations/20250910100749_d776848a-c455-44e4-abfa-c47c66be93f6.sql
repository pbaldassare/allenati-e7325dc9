-- Cancellazione abbonamento per cibariussrl@gmail.com
UPDATE public.user_subscriptions 
SET status = 'cancelled', updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'cibariussrl@gmail.com'
) AND status = 'active';