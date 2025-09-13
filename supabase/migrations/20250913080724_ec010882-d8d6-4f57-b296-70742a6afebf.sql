-- Cancel the active subscription for Paolo Prova at Combat Lab
UPDATE public.user_subscriptions 
SET status = 'cancelled',
    updated_at = now()
WHERE id = '8061f63f-d835-42aa-8bfa-9cd8484d11ac'
  AND user_id = 'dedcb1d4-4d85-40a4-ae6e-0b17d9fc959f'
  AND status = 'active';