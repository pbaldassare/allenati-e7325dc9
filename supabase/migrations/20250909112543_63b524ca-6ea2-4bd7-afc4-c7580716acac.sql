-- First, remove orphaned memberships where user doesn't exist in auth.users
DELETE FROM public.user_gym_memberships 
WHERE user_id NOT IN (
  SELECT id FROM auth.users
);

-- Then create missing profiles only for users that actually exist in auth.users
INSERT INTO public.profiles (
  user_id,
  first_name,
  last_name,
  email,
  fiscal_code,
  phone,
  emergency_contact_name,
  emergency_contact_phone,
  current_credits,
  created_at,
  updated_at
)
SELECT DISTINCT
  ugm.user_id,
  'Nome' as first_name,
  'Da Completare' as last_name,
  COALESCE(au.email, 'email@dacompletare.com') as email,
  'TEMP_' || UPPER(LEFT(ugm.user_id::text, 11)) as fiscal_code,
  null as phone,
  null as emergency_contact_name,
  null as emergency_contact_phone,
  1 as current_credits,
  now() as created_at,
  now() as updated_at
FROM public.user_gym_memberships ugm
JOIN auth.users au ON ugm.user_id = au.id
LEFT JOIN public.profiles p ON ugm.user_id = p.user_id
WHERE ugm.status = 'active' 
  AND p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Add welcome credit transaction for users without any credit history
INSERT INTO public.credits_transactions (
  user_id,
  amount,
  balance_after,
  transaction_type,
  description,
  created_at
)
SELECT 
  p.user_id,
  1 as amount,
  1 as balance_after,
  'welcome_bonus' as transaction_type,
  'Credito di benvenuto per profilo mancante' as description,
  now() as created_at
FROM public.profiles p
LEFT JOIN public.credits_transactions ct ON p.user_id = ct.user_id
WHERE p.first_name = 'Nome' 
  AND p.last_name = 'Da Completare'
  AND ct.user_id IS NULL;

-- Create function to prevent future orphaned memberships
CREATE OR REPLACE FUNCTION public.ensure_profile_exists_before_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'User does not exist in auth.users table';
  END IF;
  
  -- Check if profile exists for the user
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.user_id) THEN
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
      'TEMP_' || UPPER(LEFT(NEW.user_id::text, 11)),
      1
    );
    
    -- Add welcome credit transaction
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
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically create profiles when memberships are created
DROP TRIGGER IF EXISTS ensure_profile_before_membership ON public.user_gym_memberships;
CREATE TRIGGER ensure_profile_before_membership
  BEFORE INSERT ON public.user_gym_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_exists_before_membership();