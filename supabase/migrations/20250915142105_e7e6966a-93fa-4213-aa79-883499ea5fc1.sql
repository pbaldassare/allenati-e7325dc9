-- Fix RLS issues by updating the smart_generate_sessions_with_weeks function
-- and adding proper search_path security settings

CREATE OR REPLACE FUNCTION public.smart_generate_sessions_with_weeks(
  _course_id uuid, 
  _duration_weeks integer DEFAULT 12, 
  _start_date date DEFAULT NULL::date
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
SET search_path = public
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
  affected_bookings_count INTEGER := 0;
BEGIN
  -- Validazioni input
  IF _duration_weeks < 1 OR _duration_weeks > 52 THEN
    RAISE EXCEPTION 'Duration weeks must be between 1 and 52';
  END IF;

  -- Log dell'inizio operazione
  RAISE LOG 'Starting smart_generate_sessions_with_weeks for course: %, duration: % weeks', _course_id, _duration_weeks;

  -- Get course details including duration
  SELECT max_participants, 
         COALESCE(courses.start_date, CURRENT_DATE) as start_date
  INTO course_max_participants, calculated_start_date
  FROM public.courses 
  WHERE id = _course_id;
  
  IF course_max_participants IS NULL THEN
    RAISE EXCEPTION 'Course not found with id: %', _course_id;
  END IF;

  -- Use provided start_date or course start_date
  calculated_start_date := COALESCE(_start_date, calculated_start_date);
  
  -- Calculate end date based on duration in weeks
  calculated_end_date := calculated_start_date + (_duration_weeks * INTERVAL '7 days');
  
  -- Update course with new dates and duration
  UPDATE public.courses 
  SET 
    duration_weeks = _duration_weeks,
    start_date = calculated_start_date,
    end_date = calculated_end_date,
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
  
  -- CRITICAL: Delete ALL existing future sessions (clean slate approach)
  WITH deleted_sessions AS (
    DELETE FROM public.course_sessions 
    WHERE course_id = _course_id 
      AND session_date >= CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted_sessions;
  
  RAISE LOG 'Deleted % existing future sessions', deleted_count;
  
  -- Get active schedules - Use explicit schema to bypass RLS
  IF NOT EXISTS (SELECT 1 FROM public.course_schedules WHERE course_id = _course_id AND is_active = true) THEN
    RAISE LOG 'No active schedules found for course %', _course_id;
    -- Return early if no schedules
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
  
  -- Loop through each schedule for the course - Use explicit schema
  FOR schedule_record IN 
    SELECT day_of_week, start_time, end_time, room_id, room_name 
    FROM public.course_schedules 
    WHERE course_id = _course_id AND is_active = true
  LOOP
    RAISE LOG 'Processing schedule: day_of_week=%, start_time=%, room_id=%', 
      schedule_record.day_of_week, schedule_record.start_time, schedule_record.room_id;
    
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
        AND iter_date >= course_schedule_exceptions.start_date 
        AND iter_date <= course_schedule_exceptions.end_date
      ) INTO is_exception;
      
      -- Only create session if not in exception period
      IF NOT is_exception THEN
        -- Insert the session with ON CONFLICT handling to prevent duplicates
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
    calculated_start_date,
    calculated_end_date,
    _duration_weeks,
    format('Generated %s sessions for %s weeks (%s to %s)', 
           session_count, _duration_weeks, 
           calculated_start_date, calculated_end_date);
END;
$function$;