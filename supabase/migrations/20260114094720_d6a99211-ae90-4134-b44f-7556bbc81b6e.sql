-- Fix 1: Correct existing Friday sessions for Pugilato to match the new schedule
UPDATE public.course_sessions
SET 
  end_time = '18:00:00',
  updated_at = now()
WHERE course_id = '52c8da8f-fcd4-4b9e-862d-6b910e1d261a'
  AND EXTRACT(DOW FROM session_date) = 5  -- Friday
  AND session_date >= CURRENT_DATE
  AND status = 'scheduled';

-- Fix 2: Update generate_course_sessions_with_duration to sync existing sessions with schedule changes
CREATE OR REPLACE FUNCTION public.generate_course_sessions_with_duration(_course_id uuid, _start_date date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  schedule_record RECORD;
  iter_date DATE;
  session_count INTEGER := 0;
  course_max_participants INTEGER;
  course_duration_weeks INTEGER;
  calculated_start_date DATE;
  calculated_end_date DATE;
  is_exception BOOLEAN;
BEGIN
  -- Get course details including duration
  SELECT max_participants, duration_weeks, 
         COALESCE(start_date, CURRENT_DATE) as start_date
  INTO course_max_participants, course_duration_weeks, calculated_start_date
  FROM courses 
  WHERE id = _course_id;
  
  -- Use provided start_date or course start_date
  calculated_start_date := COALESCE(_start_date, calculated_start_date);
  
  -- Calculate end date based on duration in weeks
  calculated_end_date := calculated_start_date + (course_duration_weeks * INTERVAL '7 days');
  
  -- Update course end_date if needed
  UPDATE courses 
  SET end_date = calculated_end_date 
  WHERE id = _course_id AND (end_date IS NULL OR end_date != calculated_end_date);
  
  -- NEW: First, sync existing future sessions with current schedules
  -- This ensures that if schedule times changed, sessions are updated
  UPDATE public.course_sessions cs
  SET 
    start_time = s.start_time,
    end_time = s.end_time,
    room_id = s.room_id,
    room_name = s.room_name,
    updated_at = now()
  FROM public.course_schedules s
  WHERE cs.course_id = _course_id
    AND s.course_id = _course_id
    AND s.is_active = true
    AND EXTRACT(DOW FROM cs.session_date) = s.day_of_week
    AND cs.session_date >= CURRENT_DATE
    AND cs.status = 'scheduled';
  
  -- Delete sessions for days that no longer have active schedules
  DELETE FROM public.course_sessions cs
  WHERE cs.course_id = _course_id 
    AND cs.session_date >= CURRENT_DATE
    AND cs.status = 'scheduled'
    AND NOT EXISTS (
      SELECT 1 FROM public.course_schedules s
      WHERE s.course_id = _course_id 
        AND s.is_active = true
        AND EXTRACT(DOW FROM cs.session_date) = s.day_of_week
    );
  
  -- Loop through each schedule for the course to create missing sessions
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
        -- Insert the session (skip if already exists)
        INSERT INTO public.course_sessions (
          course_id,
          session_date,
          start_time,
          end_time,
          room_id,
          room_name,
          max_participants,
          available_spots
        ) VALUES (
          _course_id,
          iter_date,
          schedule_record.start_time,
          schedule_record.end_time,
          schedule_record.room_id,
          schedule_record.room_name,
          course_max_participants,
          course_max_participants
        )
        ON CONFLICT (course_id, session_date, start_time) DO NOTHING;
        
        session_count := session_count + 1;
      END IF;
      
      iter_date := iter_date + INTERVAL '7 days';
    END LOOP;
  END LOOP;
  
  RETURN session_count;
END;
$function$;