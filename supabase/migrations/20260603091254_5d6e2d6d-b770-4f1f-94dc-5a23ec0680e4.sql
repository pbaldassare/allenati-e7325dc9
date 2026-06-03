CREATE OR REPLACE FUNCTION public.check_registration_account_exists(_email text DEFAULT NULL, _fiscal_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  normalized_email text := lower(trim(coalesce(_email, '')));
  normalized_fiscal_code text := upper(regexp_replace(trim(coalesce(_fiscal_code, '')), '\s+', '', 'g'));
  email_exists boolean := false;
  fiscal_code_exists boolean := false;
BEGIN
  IF normalized_email <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE lower(email) = normalized_email
    ) INTO email_exists;
  END IF;

  IF normalized_fiscal_code <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE upper(fiscal_code) = normalized_fiscal_code
    ) INTO fiscal_code_exists;
  END IF;

  RETURN jsonb_build_object(
    'exists', email_exists OR fiscal_code_exists,
    'email_exists', email_exists,
    'fiscal_code_exists', fiscal_code_exists
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_registration_account_exists(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_registration_account_exists(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_registration_account_exists(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  selected_gym_id uuid;
  is_minor boolean;
  guardian_full_name text;
  user_belt public.belt_level;
  gym_name_for_email text;
  welcome_email_payload jsonb;
  profile_exists boolean;
  privacy_accepted_flag boolean;
  new_fiscal_code text;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = NEW.id) INTO profile_exists;

  is_minor := COALESCE((NEW.raw_user_meta_data ->> 'is_minor')::boolean, false);
  privacy_accepted_flag := COALESCE((NEW.raw_user_meta_data ->> 'privacy_accepted')::boolean, false);
  new_fiscal_code := upper(NULLIF(trim(NEW.raw_user_meta_data ->> 'fiscal_code'), ''));

  IF is_minor THEN
    guardian_full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'guardian_first_name','') || ' ' || COALESCE(NEW.raw_user_meta_data ->> 'guardian_last_name','')), '');
  END IF;

  IF NEW.raw_user_meta_data ->> 'belt' IS NOT NULL AND NEW.raw_user_meta_data ->> 'belt' != '' THEN
    user_belt := (NEW.raw_user_meta_data ->> 'belt')::public.belt_level;
  ELSE
    user_belt := NULL;
  END IF;

  selected_gym_id := NULLIF(NEW.raw_user_meta_data ->> 'selected_gym_id', '')::uuid;

  IF new_fiscal_code IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE upper(fiscal_code) = new_fiscal_code
      AND user_id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_ALREADY_EXISTS_FISCAL_CODE'
      USING ERRCODE = 'unique_violation';
  END IF;

  IF profile_exists THEN
    UPDATE public.profiles SET
      first_name = COALESCE(NEW.raw_user_meta_data ->> 'first_name', first_name),
      last_name = COALESCE(NEW.raw_user_meta_data ->> 'last_name', last_name),
      phone = NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
      fiscal_code = COALESCE(new_fiscal_code, fiscal_code),
      emergency_contact_name = CASE WHEN is_minor THEN guardian_full_name ELSE emergency_contact_name END,
      emergency_contact_phone = CASE WHEN is_minor THEN NULLIF(NEW.raw_user_meta_data ->> 'guardian_phone', '') ELSE emergency_contact_phone END,
      email = NEW.email,
      belt = COALESCE(user_belt, belt),
      privacy_accepted_at = CASE WHEN privacy_accepted_flag THEN now() ELSE privacy_accepted_at END,
      privacy_version = CASE WHEN privacy_accepted_flag THEN COALESCE(NEW.raw_user_meta_data ->> 'privacy_version', '1.0') ELSE privacy_version END,
      updated_at = now()
    WHERE user_id = NEW.id;
  ELSE
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name,
      phone,
      fiscal_code,
      emergency_contact_name,
      emergency_contact_phone,
      email,
      current_credits,
      belt,
      privacy_accepted_at,
      privacy_version
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nome'),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Cognome'),
      NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
      new_fiscal_code,
      CASE WHEN is_minor THEN guardian_full_name ELSE NULL END,
      CASE WHEN is_minor THEN NULLIF(NEW.raw_user_meta_data ->> 'guardian_phone', '') ELSE NULL END,
      NEW.email,
      1,
      user_belt,
      CASE WHEN privacy_accepted_flag THEN now() ELSE NULL END,
      CASE WHEN privacy_accepted_flag THEN COALESCE(NEW.raw_user_meta_data ->> 'privacy_version', '1.0') ELSE NULL END
    );

    INSERT INTO public.credits_transactions (
      user_id,
      gym_id,
      amount,
      balance_after,
      transaction_type,
      description
    ) VALUES (
      NEW.id,
      selected_gym_id,
      1,
      1,
      'welcome_bonus',
      'Credito di benvenuto gratuito'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'basic_user')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  IF selected_gym_id IS NOT NULL THEN
    INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
    VALUES (NEW.id, selected_gym_id, 'member', 'active')
    ON CONFLICT DO NOTHING;

    SELECT name INTO gym_name_for_email
    FROM public.gyms
    WHERE id = selected_gym_id;
  END IF;

  welcome_email_payload := jsonb_build_object(
    'userEmail', NEW.email,
    'firstName', COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nome'),
    'lastName', COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Cognome'),
    'creditsReceived', 1,
    'gymName', gym_name_for_email
  );

  BEGIN
    PERFORM
      net.http_post(
        url := 'https://qyryykmpadguzxyiotur.supabase.co/functions/v1/send-welcome-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := welcome_email_payload
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to send welcome email for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;