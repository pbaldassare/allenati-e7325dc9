-- Fix manual_enroll_user per supportare abbonamenti unlimited_access
-- Prima verifica se esiste abbonamento unlimited, poi solo se non esiste controlla i crediti

CREATE OR REPLACE FUNCTION public.manual_enroll_user(_user_id uuid, _session_id uuid, _enrolled_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  _booking_id uuid;
  _course_id uuid;
  _session_date date;
  _session_time time;
  _credits_required integer;
  _credits_to_use integer;
  _available_spots integer;
  _gym_id uuid;
  _current_gym_credits integer;
  _new_balance integer;
  _has_unlimited boolean;
  _existing_booking_id uuid;
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
  
  IF _course_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- Check if user is already enrolled
  SELECT id INTO _existing_booking_id
  FROM public.bookings
  WHERE user_id = _user_id 
    AND session_id = _session_id 
    AND status IN ('confirmed', 'waitlist');
  
  IF _existing_booking_id IS NOT NULL THEN
    RAISE EXCEPTION 'User is already enrolled in this session';
  END IF;
  
  -- Check if spots available
  IF _available_spots <= 0 THEN
    RAISE EXCEPTION 'No available spots for this session';
  END IF;
  
  -- Check if user has active unlimited subscription for this gym
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = _user_id
      AND sp.gym_id = _gym_id
      AND us.status = 'active'
      AND us.expires_at > NOW()
      AND sp.unlimited_access = true
  ) INTO _has_unlimited;
  
  IF _has_unlimited THEN
    -- User has unlimited access, no credits needed
    _credits_to_use := 0;
    _new_balance := NULL;
    
    RAISE LOG 'Manual enrollment (UNLIMITED): user=%, gym=%, session=%', _user_id, _gym_id, _session_id;
  ELSE
    -- Check credits as before
    SELECT COALESCE(credits, 0) INTO _current_gym_credits
    FROM public.gym_credits
    WHERE user_id = _user_id AND gym_id = _gym_id;
    
    IF _current_gym_credits IS NULL THEN
      _current_gym_credits := 0;
    END IF;
    
    IF _current_gym_credits < _credits_required THEN
      RAISE EXCEPTION 'Crediti insufficienti. Richiesti: %, Disponibili: %', _credits_required, _current_gym_credits;
    END IF;
    
    _credits_to_use := _credits_required;
    _new_balance := _current_gym_credits - _credits_required;
    
    RAISE LOG 'Manual enrollment (CREDITS): user=%, gym=%, credits=%->%', 
      _user_id, _gym_id, _current_gym_credits, _new_balance;
  END IF;
  
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
    _credits_to_use,
    'Iscrizione manuale da staff'
  ) RETURNING id INTO _booking_id;
  
  -- Only handle credits if not unlimited
  IF NOT _has_unlimited AND _credits_to_use > 0 THEN
    -- Create credits transaction
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
      -_credits_to_use,
      _new_balance,
      'booking',
      'Iscrizione manuale - ' || (SELECT name FROM courses WHERE id = _course_id),
      _booking_id
    );
    
    -- Update gym_credits
    INSERT INTO public.gym_credits (user_id, gym_id, credits)
    VALUES (_user_id, _gym_id, _new_balance)
    ON CONFLICT (user_id, gym_id)
    DO UPDATE SET 
      credits = _new_balance,
      updated_at = now();
  END IF;
  
  RETURN _booking_id;
END;
$$;