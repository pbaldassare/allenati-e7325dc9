-- Fix fiscal code conflicts in profile creation
-- Replace the ensure_profile_exists_before_membership function to generate unique temporary fiscal codes

CREATE OR REPLACE FUNCTION public.ensure_profile_exists_before_membership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  temp_fiscal_code text;
  attempt_count integer := 0;
  max_attempts integer := 5;
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'User does not exist in auth.users table';
  END IF;
  
  -- Check if profile exists for the user
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.user_id) THEN
    -- Generate a unique temporary fiscal code
    LOOP
      -- Create a more unique temporary fiscal code using timestamp and random
      temp_fiscal_code := 'TEMP_' || EXTRACT(EPOCH FROM now())::bigint || '_' || (random() * 1000)::integer;
      
      -- Check if this fiscal code already exists
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE fiscal_code = temp_fiscal_code) THEN
        EXIT; -- Found a unique one, exit the loop
      END IF;
      
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        -- If we can't find a unique fiscal code after max attempts, use UUID
        temp_fiscal_code := 'TEMP_' || REPLACE(gen_random_uuid()::text, '-', '');
        EXIT;
      END IF;
    END LOOP;
    
    -- Create a placeholder profile with unique fiscal code
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      email,
      fiscal_code,
      current_credits
    ) VALUES (
      NEW.user_id,
      'Nome',
      'Da Completare', 
      COALESCE((SELECT email FROM auth.users WHERE id = NEW.user_id), 'email@dacompletare.com'),
      temp_fiscal_code,
      1
    )
    ON CONFLICT (user_id) DO NOTHING; -- In case handle_new_user already created it
    
    -- Add welcome credit transaction only if profile was actually created
    IF FOUND THEN
      INSERT INTO public.credits_transactions (
        user_id,
        amount,
        balance_after,
        transaction_type,
        description
      ) VALUES (
        NEW.user_id,
        1,
        1,
        'welcome_bonus',
        'Credito di benvenuto automatico'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;