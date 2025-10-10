-- Fix manual_enroll_user function to correctly handle gym_credits balance
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
  
  -- FIX: Get current gym credits for user with COALESCE
  SELECT COALESCE(credits, 0) INTO _current_gym_credits
  FROM public.gym_credits
  WHERE user_id = _user_id AND gym_id = _gym_id;
  
  -- FIX: Default to 0 if no record found
  IF _current_gym_credits IS NULL THEN
    _current_gym_credits := 0;
  END IF;
  
  -- FIX: Check if user has enough credits
  IF _current_gym_credits < _credits_required THEN
    RAISE EXCEPTION 'Crediti insufficienti. Richiesti: %, Disponibili: %', _credits_required, _current_gym_credits;
  END IF;
  
  -- FIX: Calculate new balance correctly
  _new_balance := _current_gym_credits - _credits_required;
  
  -- LOG: Add debug logging
  RAISE LOG 'Manual enrollment: user=%, gym=%, current_credits=%, required=%, new_balance=%', 
    _user_id, _gym_id, _current_gym_credits, _credits_required, _new_balance;
  
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
    'Iscrizione manuale da staff'
  ) RETURNING id INTO _booking_id;
  
  -- FIX: Create credits transaction with correct balance_after
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
    'Iscrizione manuale - ' || (SELECT name FROM courses WHERE id = _course_id),
    _booking_id
  );
  
  -- FIX: Update gym_credits with upsert
  INSERT INTO public.gym_credits (user_id, gym_id, credits)
  VALUES (_user_id, _gym_id, _new_balance)
  ON CONFLICT (user_id, gym_id)
  DO UPDATE SET 
    credits = _new_balance,
    updated_at = now();
  
  RAISE LOG 'Manual enrollment completed successfully: booking_id=%', _booking_id;
  
  RETURN _booking_id;
END;
$function$;