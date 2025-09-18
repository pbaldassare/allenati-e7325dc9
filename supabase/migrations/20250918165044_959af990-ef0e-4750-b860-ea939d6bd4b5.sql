-- Remove the test transaction
DELETE FROM public.credits_transactions 
WHERE description = 'Test transaction to verify trigger functionality'
  AND user_id = '160e299f-0bdd-4d53-b7d4-1adadbf43fb6';