
-- Aggiungo 1 credito a Margherita Antonelli
INSERT INTO public.credits_transactions (
  user_id,
  gym_id,
  amount,
  balance_after,
  transaction_type,
  description
) VALUES (
  'e3acdc05-d050-4997-a1c0-2331589d0665',
  '8abc8f4d-4260-4850-a0d0-b1ada1265701',
  1,
  1,
  'manual_credit',
  'Credito aggiunto manualmente dall''amministratore'
);
