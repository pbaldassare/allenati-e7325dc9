-- Test the trigger by inserting a test credit transaction
INSERT INTO public.credits_transactions (
    user_id,
    gym_id,
    amount,
    balance_after,
    transaction_type,
    description
) VALUES (
    '160e299f-0bdd-4d53-b7d4-1adadbf43fb6', -- existing user
    '24140ca1-d9b9-4987-a5b8-6077fa20015b', -- existing gym
    5,
    5,
    'test',
    'Test transaction to verify trigger functionality'
);

-- Check if the trigger updated gym_credits table
SELECT 
    gc.user_id,
    gc.gym_id,
    gc.credits,
    gc.updated_at
FROM gym_credits gc
WHERE gc.user_id = '160e299f-0bdd-4d53-b7d4-1adadbf43fb6' 
  AND gc.gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b';