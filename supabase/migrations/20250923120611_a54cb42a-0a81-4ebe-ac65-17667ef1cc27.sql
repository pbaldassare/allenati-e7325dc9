-- Step 1: Fix manual_enroll_user function to use gym_credits properly
CREATE OR REPLACE FUNCTION public.manual_enroll_user(_user_id uuid, _session_id uuid, _enrolled_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _booking_id uuid;
  _course_id uuid;
  _session_date date;
  _session_time time;
  _credits_required integer;
  _available_spots integer;
  _gym_id uuid;
  _current_gym_credits integer;
  _new_balance integer;
BEGIN
  -- Check if enrolling user has permission
  IF NOT (has_role(_enrolled_by, 'admin'::app_role) OR 
          has_role(_enrolled_by, 'gym_owner'::app_role) OR 
          has_role(_enrolled_by, 'instructor'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Get session details and course info
  SELECT cs.course_id, cs.session_date, cs.start_time, cs.available_spots, c.gym_id, c.credits_required
  INTO _course_id, _session_date, _session_time, _available_spots, _gym_id, _credits_required
  FROM public.course_sessions cs
  JOIN public.courses c ON cs.course_id = c.id
  WHERE cs.id = _session_id;
  
  -- Check if spots available
  IF _available_spots <= 0 THEN
    RAISE EXCEPTION 'No available spots for this session';
  END IF;
  
  -- Get current gym credits for user
  SELECT COALESCE(credits, 0) INTO _current_gym_credits
  FROM public.gym_credits
  WHERE user_id = _user_id AND gym_id = _gym_id;
  
  -- Check if user has enough credits
  IF _current_gym_credits < _credits_required THEN
    RAISE EXCEPTION 'Insufficient credits. Required: %, Available: %', _credits_required, _current_gym_credits;
  END IF;
  
  -- Calculate new balance
  _new_balance := _current_gym_credits - _credits_required;
  
  -- Create booking
  INSERT INTO public.bookings (
    user_id,
    course_id,
    session_id,
    scheduled_date,
    scheduled_time,
    status,
    credits_used,
    notes
  ) VALUES (
    _user_id,
    _course_id,
    _session_id,
    _session_date,
    _session_time,
    'confirmed',
    _credits_required,
    'Manual enrollment by staff'
  ) RETURNING id INTO _booking_id;
  
  -- Create credits transaction with gym_id
  INSERT INTO public.credits_transactions (
    user_id,
    gym_id,
    amount,
    balance_after,
    transaction_type,
    description,
    reference_id
  ) VALUES (
    _user_id,
    _gym_id,
    -_credits_required,
    _new_balance,
    'booking',
    'Manual enrollment - ' || (SELECT name FROM courses WHERE id = _course_id),
    _booking_id
  );
  
  RETURN _booking_id;
END;
$function$;

-- Step 2: Create function to recalculate all gym credits based on transactions
CREATE OR REPLACE FUNCTION public.recalculate_all_gym_credits_fixed()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- Step 3: Update existing transactions that are missing gym_id
-- First, update booking-related transactions to have the correct gym_id
UPDATE public.credits_transactions 
SET gym_id = (
  SELECT c.gym_id 
  FROM public.bookings b
  JOIN public.courses c ON b.course_id = c.id
  WHERE b.id = credits_transactions.reference_id
)
WHERE transaction_type = 'booking' 
  AND gym_id IS NULL 
  AND reference_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.bookings b 
    JOIN public.courses c ON b.course_id = c.id
    WHERE b.id = credits_transactions.reference_id
  );

-- Update welcome_bonus transactions to use the user's first gym membership
UPDATE public.credits_transactions 
SET gym_id = (
  SELECT ugm.gym_id 
  FROM public.user_gym_memberships ugm 
  WHERE ugm.user_id = credits_transactions.user_id 
    AND ugm.status = 'active'
  ORDER BY ugm.created_at ASC
  LIMIT 1
)
WHERE transaction_type = 'welcome_bonus' 
  AND gym_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_gym_memberships ugm 
    WHERE ugm.user_id = credits_transactions.user_id 
      AND ugm.status = 'active'
  );

-- Step 4: Recalculate all gym credits
SELECT public.recalculate_all_gym_credits_fixed();

-- Step 5: Fix the update_gym_credits trigger to handle balance calculations correctly
CREATE OR REPLACE FUNCTION public.update_gym_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_balance integer;
BEGIN
  -- Only process if gym_id is not NULL
  IF NEW.gym_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate new balance for this gym
  SELECT COALESCE(SUM(amount), 0) INTO new_balance
  FROM public.credits_transactions
  WHERE user_id = NEW.user_id AND gym_id = NEW.gym_id;
  
  -- Update or insert gym credits
  INSERT INTO public.gym_credits (user_id, gym_id, credits)
  VALUES (NEW.user_id, NEW.gym_id, new_balance)
  ON CONFLICT (user_id, gym_id)
  DO UPDATE SET 
    credits = new_balance,
    updated_at = now();
  
  -- Update the balance_after field in the transaction
  NEW.balance_after := new_balance;
  
  RETURN NEW;
END;
$function$;