-- First, let's check and fix the trigger for updating gym_credits
-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS update_gym_credits_trigger ON public.credits_transactions;

-- Recreate the trigger to ensure it's active
CREATE TRIGGER update_gym_credits_trigger
  AFTER INSERT OR UPDATE ON public.credits_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gym_credits();

-- Create a function to recalculate all gym credits balances
CREATE OR REPLACE FUNCTION public.recalculate_all_gym_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  transaction_record RECORD;
BEGIN
  -- Clear existing gym_credits to start fresh
  DELETE FROM public.gym_credits;
  
  -- Recalculate balances for all users and gyms
  FOR transaction_record IN 
    SELECT 
      user_id,
      gym_id,
      SUM(amount) as total_credits
    FROM public.credits_transactions 
    WHERE gym_id IS NOT NULL
    GROUP BY user_id, gym_id
    HAVING SUM(amount) != 0
  LOOP
    INSERT INTO public.gym_credits (user_id, gym_id, credits)
    VALUES (
      transaction_record.user_id,
      transaction_record.gym_id,
      transaction_record.total_credits
    )
    ON CONFLICT (user_id, gym_id)
    DO UPDATE SET 
      credits = transaction_record.total_credits,
      updated_at = now();
  END LOOP;
  
  RAISE LOG 'Recalculated gym credits for all users';
END;
$$;

-- Execute the recalculation
SELECT public.recalculate_all_gym_credits();