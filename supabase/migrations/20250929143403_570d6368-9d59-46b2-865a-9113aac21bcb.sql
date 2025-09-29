-- Manual refund for test2@allenati.me booking 99256d83-e2ca-4dc1-b48e-a014109b0112 that was cancelled but not refunded
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
  1,
  'refund',
  'Rimborso manuale per cancellazione proprietario - booking 99256d83-e2ca-4dc1-b48e-a014109b0112',
  '99256d83-e2ca-4dc1-b48e-a014109b0112'
);