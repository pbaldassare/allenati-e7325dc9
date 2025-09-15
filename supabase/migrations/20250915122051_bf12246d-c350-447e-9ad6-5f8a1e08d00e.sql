-- Migliorare la funzione per gestione intelligente delle sessioni
CREATE OR REPLACE FUNCTION public.smart_generate_sessions_with_weeks(
  _course_id uuid, 
  _duration_weeks integer DEFAULT 12,
  _start_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  schedule_record RECORD;
  iter_date DATE;
  session_count INTEGER := 0;
  deleted_count INTEGER := 0;
  course_max_participants INTEGER;
  calculated_start_date DATE;
  calculated_end_date DATE;
  is_exception BOOLEAN;
  affected_bookings INTEGER := 0;
BEGIN
  -- Validazioni input
  IF _duration_weeks < 1 OR _duration_weeks > 52 THEN
    RAISE EXCEPTION 'Duration weeks must be between 1 and 52';
  END IF;

  -- Get course details including duration
  SELECT max_participants, 
         COALESCE(start_date, CURRENT_DATE) as start_date
  INTO course_max_participants, calculated_start_date
  FROM courses 
  WHERE id = _course_id;
  
  IF course_max_participants IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  -- Use provided start_date or course start_date
  calculated_start_date := COALESCE(_start_date, calculated_start_date);
  
  -- Calculate end date based on duration in weeks
  calculated_end_date := calculated_start_date + (_duration_weeks * INTERVAL '7 days');
  
  -- Update course with new dates and duration
  UPDATE courses 
  SET 
    duration_weeks = _duration_weeks,
    start_date = calculated_start_date,
    end_date = calculated_end_date,
    updated_at = now()
  WHERE id = _course_id;
  
  -- Count affected bookings before deletion
  SELECT COUNT(*) INTO affected_bookings
  FROM bookings b
  JOIN course_sessions cs ON b.session_id = cs.id
  WHERE cs.course_id = _course_id 
    AND cs.session_date >= CURRENT_DATE
    AND b.status = 'confirmed';
  
  -- Delete ALL existing future sessions (clean slate approach)
  DELETE FROM public.course_sessions 
  WHERE course_id = _course_id 
    AND session_date >= CURRENT_DATE
  RETURNING id INTO deleted_count;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Loop through each schedule for the course
  FOR schedule_record IN 
    SELECT day_of_week, start_time, end_time, room_id, room_name 
    FROM course_schedules 
    WHERE course_id = _course_id AND is_active = true
  LOOP
    -- Start from the start_date
    iter_date := calculated_start_date;
    
    -- Find the first occurrence of the target day of week
    WHILE EXTRACT(DOW FROM iter_date) != schedule_record.day_of_week LOOP
      iter_date := iter_date + INTERVAL '1 day';
    END LOOP;
    
    -- Generate sessions for this day of week until end_date
    WHILE iter_date <= calculated_end_date LOOP
      -- Check if this date falls within any exception period
      SELECT EXISTS (
        SELECT 1 FROM public.course_schedule_exceptions 
        WHERE course_id = _course_id 
        AND iter_date >= start_date 
        AND iter_date <= end_date
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
        );
        
        session_count := session_count + 1;
      END IF;
      
      iter_date := iter_date + INTERVAL '7 days';
    END LOOP;
  END LOOP;
  
  -- Return comprehensive result
  RETURN jsonb_build_object(
    'success', true,
    'sessions_created', session_count,
    'sessions_deleted', deleted_count,
    'affected_bookings', affected_bookings,
    'start_date', calculated_start_date,
    'end_date', calculated_end_date,
    'duration_weeks', _duration_weeks,
    'message', format('Generated %s sessions for %s weeks (%s to %s)', 
                     session_count, _duration_weeks, 
                     calculated_start_date, calculated_end_date)
  );
END;
$function$;