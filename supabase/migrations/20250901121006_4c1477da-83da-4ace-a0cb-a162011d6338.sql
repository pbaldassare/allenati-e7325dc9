-- Aggiungere 100 crediti all'utente cibariussrl@gmail.com (Paolo Prova)
-- User ID: dedcb1d4-4d85-40a4-ae6e-0b17d9fc959f

-- Inserire la transazione di crediti
INSERT INTO public.credits_transactions (
  user_id,
  amount,
  balance_after,
  transaction_type,
  description
) VALUES (
  'dedcb1d4-4d85-40a4-ae6e-0b17d9fc959f',
  100,
  101,
  'admin_grant',
  '100 crediti aggiunti manualmente dall''admin'
);

-- Aggiornare il balance nel profilo utente
UPDATE public.profiles 
SET current_credits = 101
WHERE user_id = 'dedcb1d4-4d85-40a4-ae6e-0b17d9fc959f';