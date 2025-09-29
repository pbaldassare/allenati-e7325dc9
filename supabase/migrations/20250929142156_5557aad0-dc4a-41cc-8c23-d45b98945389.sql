-- Manual refund for test2@allenati.me booking 2b2ec90a-3d74-47b4-8efe-9461bc27a1d7 that was cancelled but not refunded
INSERT INTO public.credits_transactions (
  user_id,
  gym_id,
  amount,
  balance_after,
  transaction_type,
  description,
  reference_id
) VALUES (
  '82b26571-e9a4-4144-a8fa-5c825788bf9a',
  '24140ca1-d9b9-4987-a5b8-6077fa20015b',
  1,
  2,
  'refund',
  'Rimborso manuale per cancellazione istruttore - booking 2b2ec90a-3d74-47b4-8efe-9461bc27a1d7',
  '2b2ec90a-3d74-47b4-8efe-9461bc27a1d7'
);