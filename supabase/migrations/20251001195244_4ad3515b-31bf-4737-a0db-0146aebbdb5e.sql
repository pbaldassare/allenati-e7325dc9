
-- Insert manual refund transaction for test6@allenati.me
INSERT INTO public.credits_transactions (
  user_id,
  gym_id,
  amount,
  balance_after,
  transaction_type,
  description
) VALUES (
  '2d4f817f-c880-4c51-a325-ac4dea756531',
  '24140ca1-d9b9-4987-a5b8-6077fa20015b',
  1,
  1,
  'manual_refund',
  'Rimborso manuale per problema tecnico - cancellazione da calendario'
);

-- Update gym_credits for the user
INSERT INTO public.gym_credits (user_id, gym_id, credits)
VALUES (
  '2d4f817f-c880-4c51-a325-ac4dea756531',
  '24140ca1-d9b9-4987-a5b8-6077fa20015b',
  1
)
ON CONFLICT (user_id, gym_id) 
DO UPDATE SET 
  credits = gym_credits.credits + 1,
  updated_at = now();
