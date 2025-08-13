-- Add current_credits field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN current_credits INTEGER DEFAULT 0;

-- Create default subscription plans
INSERT INTO public.subscription_plans (name, description, price, duration_days, credits_included, unlimited_access, is_trial, features) VALUES
('Credito Benvenuto', 'Credito gratuito di benvenuto per nuovi utenti', 0, 30, 1, false, true, ARRAY['1 lezione gratuita', 'Perfetto per iniziare']),
('Pacchetto 4 Lezioni', 'Pacchetto conveniente per 4 lezioni', 0, 90, 4, false, false, ARRAY['4 lezioni', 'Validità 3 mesi', 'Flessibilità massima']),
('Pacchetto 10 Lezioni', 'Pacchetto vantaggioso per 10 lezioni', 0, 120, 10, false, false, ARRAY['10 lezioni', 'Validità 4 mesi', 'Risparmio garantito']),
('Unlimited Mensile', 'Accesso illimitato per un mese', 0, 30, 0, true, false, ARRAY['Lezioni illimitate', 'Accesso a tutti i corsi', 'Validità 30 giorni']),
('Unlimited Annuale', 'Accesso illimitato per un anno', 0, 365, 0, true, false, ARRAY['Lezioni illimitate', 'Accesso a tutti i corsi', 'Validità 365 giorni', 'Massimo risparmio']);

-- Update handle_new_user function to assign 1 free credit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  selected_gym_id uuid;
  is_minor boolean;
  guardian_full_name text;
  welcome_plan_id uuid;
BEGIN
  -- Read minor flag from metadata
  is_minor := COALESCE((NEW.raw_user_meta_data ->> 'is_minor')::boolean, false);

  -- Build guardian full name if provided
  IF is_minor THEN
    guardian_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'guardian_first_name','') || ' ' || COALESCE(NEW.raw_user_meta_data ->> 'guardian_last_name','')), '');
  END IF;

  -- Create profile automatically with 1 free credit
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    phone,
    emergency_contact_name,
    emergency_contact_phone,
    email,
    current_credits
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nome'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Cognome'),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    CASE WHEN is_minor THEN guardian_full_name ELSE NULL END,
    CASE WHEN is_minor THEN NULLIF(NEW.raw_user_meta_data ->> 'guardian_phone', '') ELSE NULL END,
    NEW.email,
    1  -- Free credit
  );
  
  -- Create welcome credit transaction
  INSERT INTO public.credits_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    description
  ) VALUES (
    NEW.id,
    1,
    1,
    'welcome_bonus',
    'Credito di benvenuto gratuito'
  );
  
  -- Assign basic_user role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'basic_user');
  
  -- Create default app preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  -- Check if gym_id was provided in metadata and create membership
  selected_gym_id := (NEW.raw_user_meta_data ->> 'selected_gym_id')::uuid;
  
  IF selected_gym_id IS NOT NULL THEN
    INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
    VALUES (NEW.id, selected_gym_id, 'member', 'active');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to update current_credits automatically
CREATE OR REPLACE FUNCTION public.update_current_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance integer;
BEGIN
  -- Calculate new balance
  SELECT COALESCE(SUM(amount), 0) INTO new_balance
  FROM public.credits_transactions
  WHERE user_id = NEW.user_id;
  
  -- Update profile with new balance
  UPDATE public.profiles
  SET current_credits = new_balance
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update current_credits when credits_transactions changes
CREATE OR REPLACE TRIGGER update_credits_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.credits_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_current_credits();