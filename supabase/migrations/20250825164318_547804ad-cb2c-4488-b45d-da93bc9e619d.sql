-- Add 2 credits to utenteprova user for their gym
INSERT INTO public.gym_credits (user_id, gym_id, credits)
VALUES (
  'aefbc372-359d-46b1-9853-5d1bf24923ce', 
  '8e44d37a-bf6b-4ad7-aa33-7132f41bb6ba', 
  2
)
ON CONFLICT (user_id, gym_id) 
DO UPDATE SET 
  credits = gym_credits.credits + 2,
  updated_at = now();

-- Create a credit transaction record
INSERT INTO public.credits_transactions (
  user_id,
  gym_id,
  amount,
  balance_after,
  transaction_type,
  description
) VALUES (
  'aefbc372-359d-46b1-9853-5d1bf24923ce',
  '8e44d37a-bf6b-4ad7-aa33-7132f41bb6ba',
  2,
  (SELECT COALESCE(credits, 0) FROM gym_credits WHERE user_id = 'aefbc372-359d-46b1-9853-5d1bf24923ce' AND gym_id = '8e44d37a-bf6b-4ad7-aa33-7132f41bb6ba'),
  'admin_grant',
  'Crediti aggiunti manualmente dall''amministratore'
);