-- Correzione dell'errore "column reference start_date is ambiguous"
-- nella funzione smart_generate_sessions_with_weeks

CREATE OR REPLACE FUNCTION public.smart_generate_sessions_with_weeks(
  _course_id uuid, 
  _duration_weeks integer DEFAULT 12, 
  _start_date date DEFAULT NULL::date, 
  _new_schedules jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(
  success boolean, 
  sessions_created integer, 
  sessions_deleted integer, 
  affected_bookings integer, 
  start_date date, 
  end_date date, 
  duration_weeks integer, 
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  schedule_record RECORD;
  new_schedule_record RECORD;
  iter_date DATE;
  session_count INTEGER := 0;
  deleted_count INTEGER := 0;
  course_max_participants INTEGER;
  course_difficulty_level INTEGER;
  session_max_participants INTEGER;
  session_difficulty_level INTEGER;
  calculated_start_date DATE;
  calculated_end_date DATE;
  is_exception BOOLEAN;
  affected_bookings_count INTEGER := 0;
BEGIN
  -- Validazioni input
  IF _duration_weeks < 1 OR _duration_weeks > 52 THEN
    RAISE EXCEPTION 'Duration weeks must be between 1 and 52';
  END IF;

  -- Log dell'inizio operazione
  RAISE LOG 'Starting smart_generate_sessions_with_weeks for course: %, duration: % weeks', _course_id, _duration_weeks;

  -- Get course details including difficulty_level
  -- CORREZIONE: Uso alias "c" per evitare ambiguità con la colonna start_date
  SELECT c.max_participants, c.difficulty_level,
         COALESCE(c.start_date, CURRENT_DATE)
  INTO course_max_participants, course_difficulty_level, calculated_start_date
  FROM public.courses c
  WHERE c.id = _course_id;
  
  IF course_max_participants IS NULL THEN
    RAISE EXCEPTION 'Course not found with id: %', _course_id;
  END IF;

  -- Use provided start_date or course start_date
  calculated_start_date := COALESCE(_start_date, calculated_start_date);
  
  -- Calculate end date based on duration in weeks
  calculated_end_date := calculated_start_date + (_duration_weeks * INTERVAL '7 days');
  
  -- Update course with new dates and duration
  -- CORREZIONE: Uso alias "c" per evitare ambiguità
  UPDATE public.courses c
  SET 
    duration_weeks = _duration_weeks,
    start_date = calculated_start_date,
    end_date = calculated_end_date,
    updated_at = now()
  WHERE c.id = _course_id;
  
  -- Count affected bookings before deletion
  SELECT COUNT(*) INTO affected_bookings_count
  FROM public.bookings b
  JOIN public.course_sessions cs ON b.session_id = cs.id
  WHERE cs.course_id = _course_id 
    AND cs.session_date >= CURRENT_DATE
    AND b.status = 'confirmed';
  
  RAISE LOG 'Found % affected bookings', affected_bookings_count;
  
  -- Delete ALL existing future sessions (clean slate approach)
  WITH deleted_sessions AS (
    DELETE FROM public.course_sessions 
    WHERE course_id = _course_id 
      AND session_date >= CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_sessions;
  
  RAISE LOG 'Deleted % existing future sessions', deleted_count;

  -- Se sono stati forniti nuovi schedules, aggiorna la tabella course_schedules
  IF _new_schedules IS NOT NULL THEN
    RAISE LOG 'Updating course schedules with new data';
    
    -- Prima elimina tutti gli schedules esistenti per questo corso
    DELETE FROM public.course_schedules WHERE course_id = _course_id;
    
    -- Inserisci i nuovi schedules con i nuovi campi override
    FOR new_schedule_record IN 
      SELECT 
        (schedule->>'day_of_week')::integer as day_of_week,
        (schedule->>'start_time')::time as start_time,
        (schedule->>'end_time')::time as end_time,
        (schedule->>'room_id')::uuid as room_id,
        schedule->>'room_name' as room_name,
        (schedule->>'max_participants_override')::integer as max_participants_override,
        (schedule->>'difficulty_level_override')::integer as difficulty_level_override
      FROM jsonb_array_elements(_new_schedules) as schedule
    LOOP
      INSERT INTO public.course_schedules (
        course_id,
        day_of_week,
        start_time,
        end_time,
        room_id,
        room_name,
        max_participants_override,
        difficulty_level_override,
        is_active
      ) VALUES (
        _course_id,
        new_schedule_record.day_of_week,
        new_schedule_record.start_time,
        new_schedule_record.end_time,
        new_schedule_record.room_id,
        new_schedule_record.room_name,
        new_schedule_record.max_participants_override,
        new_schedule_record.difficulty_level_override,
        true
      );
    END LOOP;
    
    RAISE LOG 'Course schedules updated successfully';
  END IF;
  
  -- Get active schedules
  IF NOT EXISTS (SELECT 1 FROM public.course_schedules WHERE course_id = _course_id AND is_active = true) THEN
    RAISE LOG 'No active schedules found for course %', _course_id;
    RETURN QUERY SELECT 
      true,
      0,
      deleted_count,
      affected_bookings_count,
      calculated_start_date,
      calculated_end_date,
      _duration_weeks,
      'No active schedules found - no sessions created';
    RETURN;
  END IF;
  
  -- Loop through each schedule for the course (now including override fields)
  FOR schedule_record IN 
    SELECT cs.day_of_week, cs.start_time, cs.end_time, cs.room_id, cs.room_name,
           cs.max_participants_override, cs.difficulty_level_override
    FROM public.course_schedules cs
    WHERE cs.course_id = _course_id AND cs.is_active = true
  LOOP
    RAISE LOG 'Processing schedule: day_of_week=%, start_time=%, room_id=%', 
              schedule_record.day_of_week, schedule_record.start_time, schedule_record.room_id;
    
    -- Calculate session_max_participants and session_difficulty_level using COALESCE
    session_max_participants := COALESCE(schedule_record.max_participants_override, course_max_participants);
    session_difficulty_level := COALESCE(schedule_record.difficulty_level_override, course_difficulty_level);
    
    iter_date := calculated_start_date;
    
    WHILE iter_date <= calculated_end_date LOOP
      IF EXTRACT(DOW FROM iter_date) = schedule_record.day_of_week THEN
        -- Check for exceptions
        SELECT EXISTS (
          SELECT 1 FROM public.course_schedule_exceptions cse
          WHERE cse.course_id = _course_id 
            AND iter_date BETWEEN cse.start_date AND cse.end_date
        ) INTO is_exception;
        
        IF NOT is_exception THEN
          -- Insert session with override values
          INSERT INTO public.course_sessions (
            course_id, session_date, start_time, end_time, 
            room_id, room_name, max_participants, available_spots, 
            difficulty_level, status
          ) VALUES (
            _course_id, iter_date, schedule_record.start_time, schedule_record.end_time,
            schedule_record.room_id, schedule_record.room_name,
            session_max_participants, session_max_participants,
            session_difficulty_level, 'scheduled'
          );
          session_count := session_count + 1;
        ELSE
          RAISE LOG 'Skipping date % due to exception', iter_date;
        END IF;
      END IF;
      
      iter_date := iter_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
  
  RAISE LOG 'Created % new sessions', session_count;
  
  RETURN QUERY SELECT 
    true,
    session_count,
    deleted_count,
    affected_bookings_count,
    calculated_start_date,
    calculated_end_date,
    _duration_weeks,
    format('Successfully regenerated sessions: %s created, %s deleted', session_count, deleted_count);
END;
$function$;