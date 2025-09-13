-- Cancel the active subscription for cibariussrl@gmail.com at Combat Lab
UPDATE public.user_subscriptions 
SET status = 'cancelled',
    updated_at = now()
WHERE id = '8061f63f-d835-42aa-8bfa-9cd8484d11ac'
  AND user_id = 'ac12cebe-9b39-49ac-8b00-3c6b67ba6aa9'
  AND status = 'active';