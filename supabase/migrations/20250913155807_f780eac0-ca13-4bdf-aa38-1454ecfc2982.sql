-- Pulizia definitiva: elimina tutte le sessioni che vanno oltre l'end_date dei corsi
DELETE FROM public.course_sessions 
WHERE course_id IN (
  SELECT c.id 
  FROM public.courses c 
  WHERE c.end_date IS NOT NULL 
  AND public.course_sessions.session_date > c.end_date
);

-- Aggiorna la funzione per rigenerare sessioni rispettando la durata
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
  
  -- CRITICAL: Delete ALL existing future sessions first
  DELETE FROM public.course_sessions 
  WHERE course_id = _course_id 
  AND session_date >= CURRENT_DATE;
  
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
        );
        
        session_count := session_count + 1;
      END IF;
      
      iter_date := iter_date + INTERVAL '7 days';
    END LOOP;
  END LOOP;
  
  RETURN session_count;
END;
$function$;