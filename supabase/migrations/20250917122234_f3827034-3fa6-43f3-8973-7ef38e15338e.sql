-- Aggiorna la funzione per accettare date esplicite invece di settimane
CREATE OR REPLACE FUNCTION public.smart_generate_sessions_with_dates(
  _course_id uuid, 
  _start_date date, 
  _end_date date,
  _new_schedules jsonb DEFAULT NULL::jsonb
) 
RETURNS TABLE(
  success boolean, 
  sessions_created integer, 
  sessions_deleted integer, 
  affected_bookings integer, 
  start_date date, 
  end_date date, 
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
  is_exception BOOLEAN;
  affected_bookings_count INTEGER := 0;
BEGIN
  -- Validazioni input
  IF _start_date >= _end_date THEN
    RAISE EXCEPTION 'Start date must be before end date';
  END IF;

  IF _end_date > _start_date + INTERVAL '2 years' THEN
    RAISE EXCEPTION 'Course duration cannot exceed 2 years';
  END IF;

  -- Log dell'inizio operazione
  RAISE LOG 'Starting smart_generate_sessions_with_dates for course: %, dates: % to %', _course_id, _start_date, _end_date;

  -- Get course details
  SELECT max_participants INTO course_max_participants
  FROM public.courses 
  WHERE id = _course_id;
  
  IF course_max_participants IS NULL THEN
    RAISE EXCEPTION 'Course not found with id: %', _course_id;
  END IF;

  -- Update course with new dates
  UPDATE public.courses 
  SET 
    start_date = _start_date,
    end_date = _end_date,
    updated_at = now()
  WHERE id = _course_id;
  
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
    
    -- Inserisci i nuovi schedules
    FOR new_schedule_record IN 
      SELECT 
        (schedule->>'day_of_week')::integer as day_of_week,
        (schedule->>'start_time')::time as start_time,
        (schedule->>'end_time')::time as end_time,
        (schedule->>'room_id')::uuid as room_id,
        schedule->>'room_name' as room_name
      FROM jsonb_array_elements(_new_schedules) as schedule
    LOOP
      INSERT INTO public.course_schedules (
        course_id,
        day_of_week,
        start_time,
        end_time,
        room_id,
        room_name,
        is_active
      ) VALUES (
        _course_id,
        new_schedule_record.day_of_week,
        new_schedule_record.start_time,
        new_schedule_record.end_time,
        new_schedule_record.room_id,
        new_schedule_record.room_name,
        true
      );
    END LOOP;
    
    RAISE LOG 'Course schedules updated successfully';
  END IF;
  
  -- Get active schedules
  IF NOT EXISTS (SELECT 1 FROM public.course_schedules WHERE course_id = _course_id AND is_active = true) THEN
    RAISE LOG 'No active schedules found for course %', _course_id;
    -- Return early if no schedules
    RETURN QUERY SELECT 
      true,
      0,
      deleted_count,
      affected_bookings_count,
      _start_date,
      _end_date,
      'No active schedules found - no sessions created';
    RETURN;
  END IF;
  
  -- Loop through each schedule for the course
  FOR schedule_record IN 
    SELECT day_of_week, start_time, end_time, room_id, room_name 
    FROM public.course_schedules 
    WHERE course_id = _course_id AND is_active = true
  LOOP
    RAISE LOG 'Processing schedule: day_of_week=%, start_time=%, room_id=%', 
      schedule_record.day_of_week, schedule_record.start_time, schedule_record.room_id;
    
    -- Start from the start_date
    iter_date := _start_date;
    
    -- Find the first occurrence of the target day of week
    WHILE EXTRACT(DOW FROM iter_date) != schedule_record.day_of_week LOOP
      iter_date := iter_date + INTERVAL '1 day';
    END LOOP;
    
    -- Generate sessions for this day of week until end_date
    WHILE iter_date <= _end_date LOOP
      -- Check if this date falls within any exception period
      SELECT EXISTS (
        SELECT 1 FROM public.course_schedule_exceptions 
        WHERE course_id = _course_id 
        AND iter_date >= course_schedule_exceptions.start_date 
        AND iter_date <= course_schedule_exceptions.end_date
      ) INTO is_exception;
      
      -- Only create session if not in exception period
      IF NOT is_exception THEN
        -- Insert the session
        INSERT INTO public.course_sessions (
          course_id,
          session_date,
          start_time,
          end_time,
          room_id,
          room_name,
          max_participants,
          available_spots,
          status
        ) VALUES (
          _course_id,
          iter_date,
          schedule_record.start_time,
          schedule_record.end_time,
          schedule_record.room_id,
          schedule_record.room_name,
          course_max_participants,
          course_max_participants,
          'scheduled'
        )
        ON CONFLICT (course_id, session_date, start_time) 
        DO UPDATE SET
          end_time = EXCLUDED.end_time,
          room_id = EXCLUDED.room_id,
          room_name = EXCLUDED.room_name,
          max_participants = EXCLUDED.max_participants,
          available_spots = EXCLUDED.available_spots,
          status = EXCLUDED.status,
          updated_at = now();
        
        session_count := session_count + 1;
      ELSE
        RAISE LOG 'Skipping session on % due to exception period', iter_date;
      END IF;
      
      iter_date := iter_date + INTERVAL '7 days';
    END LOOP;
  END LOOP;
  
  RAISE LOG 'Created % sessions total', session_count;
  
  -- Return structured result
  RETURN QUERY SELECT 
    true,
    session_count,
    deleted_count,
    affected_bookings_count,
    _start_date,
    _end_date,
    format('Generated %s sessions from %s to %s', 
           session_count, _start_date, _end_date);
END;
$function$;