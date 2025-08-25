-- Update handle_new_user function to include belt from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  selected_gym_id uuid;
  is_minor boolean;
  guardian_full_name text;
  user_belt public.belt_level;
BEGIN
  -- Read minor flag from metadata
  is_minor := COALESCE((NEW.raw_user_meta_data ->> 'is_minor')::boolean, false);

  -- Build guardian full name if provided
  IF is_minor THEN
    guardian_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'guardian_first_name','') || ' ' || COALESCE(NEW.raw_user_meta_data ->> 'guardian_last_name','')), '');
  END IF;

  -- Get belt from metadata if provided
  IF NEW.raw_user_meta_data ->> 'belt' IS NOT NULL AND NEW.raw_user_meta_data ->> 'belt' != '' THEN
    user_belt := (NEW.raw_user_meta_data ->> 'belt')::public.belt_level;
  ELSE
    user_belt := NULL;
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
    current_credits,
    belt
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nome'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Cognome'),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    CASE WHEN is_minor THEN guardian_full_name ELSE NULL END,
    CASE WHEN is_minor THEN NULLIF(NEW.raw_user_meta_data ->> 'guardian_phone', '') ELSE NULL END,
    NEW.email,
    1,  -- Free credit
    user_belt
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
$function$;