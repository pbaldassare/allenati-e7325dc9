-- Funzione per iscrizione manuale alla lista d'attesa (per owner/instructor)
-- Supporta sia utenti con abbonamento unlimited che utenti a crediti

CREATE OR REPLACE FUNCTION public.manual_enroll_to_waitlist(
  _user_id uuid,
  _session_id uuid,
  _enrolled_by uuid
)
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
  _gym_id uuid;
  _has_unlimited boolean;
  _current_gym_credits integer;
  _new_balance integer;
  _next_position integer;
  _existing_booking_id uuid;
BEGIN
  -- Verifica permessi: solo admin, owner o instructor possono usare questa funzione
  IF NOT (has_role(_enrolled_by, 'admin'::app_role) OR 
          has_role(_enrolled_by, 'gym_owner'::app_role) OR 
          has_role(_enrolled_by, 'instructor'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Ottieni dettagli sessione e corso
  SELECT cs.course_id, cs.session_date, cs.start_time, c.gym_id, c.credits_required
  INTO _course_id, _session_date, _session_time, _gym_id, _credits_required
  FROM public.course_sessions cs
  JOIN public.courses c ON cs.course_id = c.id
  WHERE cs.id = _session_id;
  
  IF _course_id IS NULL THEN
    RAISE EXCEPTION 'Sessione non trovata';
  END IF;
  
  -- Verifica se l'utente è già iscritto (confermato o in waitlist)
  SELECT id INTO _existing_booking_id
  FROM public.bookings
  WHERE user_id = _user_id 
    AND session_id = _session_id 
    AND status IN ('confirmed', 'waitlist');
  
  IF _existing_booking_id IS NOT NULL THEN
    RAISE EXCEPTION 'Utente già iscritto a questa sessione';
  END IF;
  
  -- Calcola prossima posizione nella waitlist
  SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO _next_position
  FROM public.bookings 
  WHERE session_id = _session_id AND status = 'waitlist';
  
  -- Verifica se l'utente ha abbonamento unlimited attivo per questa palestra
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
    -- Utente con accesso illimitato, nessun credito necessario
    _credits_to_use := 0;
    _new_balance := NULL;
    
    RAISE LOG 'Manual waitlist enrollment (UNLIMITED): user=%, gym=%, session=%, position=%', 
      _user_id, _gym_id, _session_id, _next_position;
  ELSE
    -- Verifica crediti
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
    
    RAISE LOG 'Manual waitlist enrollment (CREDITS): user=%, gym=%, credits=%->%, position=%', 
      _user_id, _gym_id, _current_gym_credits, _new_balance, _next_position;
  END IF;
  
  -- Crea prenotazione in waitlist
  INSERT INTO public.bookings (
    user_id,
    course_id,
    session_id,
    scheduled_date,
    scheduled_time,
    status,
    waitlist_position,
    credits_used,
    notes
  ) VALUES (
    _user_id,
    _course_id,
    _session_id,
    _session_date,
    _session_time,
    'waitlist',
    _next_position,
    _credits_to_use,
    'Iscrizione manuale in lista d''attesa da staff'
  ) RETURNING id INTO _booking_id;
  
  -- Gestisce crediti solo se non unlimited
  IF NOT _has_unlimited AND _credits_to_use > 0 THEN
    -- Crea transazione crediti
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
      'Lista d''attesa manuale - ' || (SELECT name FROM courses WHERE id = _course_id),
      _booking_id
    );
    
    -- Aggiorna gym_credits
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

-- Aggiorna promoteFromWaitlist per decrementare available_spots
CREATE OR REPLACE FUNCTION public.promote_from_waitlist(_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _session_id uuid;
  _booking_exists boolean;
BEGIN
  -- Verifica che la prenotazione esista e sia in waitlist
  SELECT session_id INTO _session_id
  FROM public.bookings
  WHERE id = _booking_id AND status = 'waitlist';
  
  IF _session_id IS NULL THEN
    RAISE EXCEPTION 'Prenotazione in waitlist non trovata';
  END IF;
  
  -- Aggiorna lo status della prenotazione a confermato
  UPDATE public.bookings
  SET 
    status = 'confirmed',
    waitlist_position = NULL,
    updated_at = NOW()
  WHERE id = _booking_id;
  
  -- Decrementa available_spots della sessione (permette valori negativi per sovraprenotazione)
  UPDATE public.course_sessions
  SET 
    available_spots = available_spots - 1,
    updated_at = NOW()
  WHERE id = _session_id;
  
  -- Ricalcola posizioni waitlist rimanenti
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position ASC) as new_pos
    FROM public.bookings
    WHERE session_id = _session_id AND status = 'waitlist'
  )
  UPDATE public.bookings b
  SET waitlist_position = r.new_pos
  FROM ranked r
  WHERE b.id = r.id;
  
  RETURN true;
END;
$$;