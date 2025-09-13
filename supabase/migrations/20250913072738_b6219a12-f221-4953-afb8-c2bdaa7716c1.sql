-- Cancel subscription for cibariussrl@gmail.com (Paolo Prova)
UPDATE public.user_subscriptions 
SET 
  status = 'cancelled',
  updated_at = now()
WHERE id = '52fa7ffb-6d40-4b49-912c-0b43be08ef4b' 
  AND user_id = (
    SELECT user_id 
    FROM public.profiles 
    WHERE email = 'cibariussrl@gmail.com'
  );