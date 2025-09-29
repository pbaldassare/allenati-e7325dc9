-- Pulizia finale del sistema crediti: rimuovi funzioni e trigger obsoleti
-- e assicurati che gym_credits sia il sistema principale

-- 1. Rimuovi eventuali trigger e funzioni obsolete per current_credits
DROP TRIGGER IF EXISTS update_credits_balance_trigger ON public.credits_transactions;
DROP TRIGGER IF EXISTS update_current_credits ON public.credits_transactions;
DROP FUNCTION IF EXISTS public.update_current_credits() CASCADE;

-- 2. Assicurati che esista il trigger corretto per gym_credits
CREATE OR REPLACE FUNCTION public.update_gym_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance integer;
BEGIN
  -- Only process if there's a gym_id (gym-specific credits)
  IF NEW.gym_id IS NOT NULL THEN
    -- Calculate new balance for this user and gym
    SELECT COALESCE(SUM(amount), 0) INTO new_balance
    FROM public.credits_transactions
    WHERE user_id = NEW.user_id AND gym_id = NEW.gym_id;
    
    -- Update or insert gym credits record
    INSERT INTO public.gym_credits (user_id, gym_id, credits, updated_at)
    VALUES (NEW.user_id, NEW.gym_id, new_balance, now())
    ON CONFLICT (user_id, gym_id)
    DO UPDATE SET 
      credits = new_balance,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Crea il trigger per gym_credits se non esiste
DROP TRIGGER IF EXISTS update_gym_credits_trigger ON public.credits_transactions;
CREATE TRIGGER update_gym_credits_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.credits_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gym_credits();

-- 4. Aggiungi commento per chiarire che current_credits in profiles è deprecato
COMMENT ON COLUMN public.profiles.current_credits IS 'DEPRECATED: Use gym_credits table instead for gym-specific credit balances';

-- 5. Ricalcola tutti i saldi di gym_credits per assicurarsi che siano corretti
INSERT INTO public.gym_credits (user_id, gym_id, credits, updated_at)
SELECT 
  user_id,
  gym_id,
  SUM(amount) as total_credits,
  now() as updated_at
FROM public.credits_transactions 
WHERE gym_id IS NOT NULL
GROUP BY user_id, gym_id
HAVING SUM(amount) != 0
ON CONFLICT (user_id, gym_id)
DO UPDATE SET 
  credits = EXCLUDED.credits,
  updated_at = now();