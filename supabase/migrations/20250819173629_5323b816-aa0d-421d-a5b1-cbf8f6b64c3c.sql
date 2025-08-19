-- Function to generate course sessions automatically
CREATE OR REPLACE FUNCTION public.generate_course_sessions(_course_id UUID, _start_date DATE, _end_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule_record RECORD;
  iter_date DATE;
  session_count INTEGER := 0;
  course_max_participants INTEGER;
BEGIN
  -- Get course details
  SELECT max_participants INTO course_max_participants FROM courses WHERE id = _course_id;
  
  -- Loop through each schedule for the course
  FOR schedule_record IN 
    SELECT day_of_week, start_time, end_time, room_id, room_name 
    FROM course_schedules 
    WHERE course_id = _course_id AND is_active = true
  LOOP
    -- Start from the start_date
    iter_date := _start_date;
    
    -- Find the first occurrence of the target day of week
    WHILE EXTRACT(DOW FROM iter_date) != schedule_record.day_of_week LOOP
      iter_date := iter_date + INTERVAL '1 day';
    END LOOP;
    
    -- Generate sessions for this day of week until end_date
    WHILE iter_date <= _end_date LOOP
      -- Insert the session (ignore duplicates)
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
      iter_date := iter_date + INTERVAL '7 days';
    END LOOP;
  END LOOP;
  
  RETURN session_count;
END;
$$;

-- Function to update available spots when booking is created/cancelled
CREATE OR REPLACE FUNCTION public.update_session_available_spots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' AND NEW.session_id IS NOT NULL THEN
    UPDATE public.course_sessions 
    SET available_spots = available_spots - 1
    WHERE id = NEW.session_id;
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE (status change)
  IF TG_OP = 'UPDATE' AND NEW.session_id IS NOT NULL THEN
    -- If booking was confirmed and now cancelled/completed, add spot back
    IF OLD.status IN ('confirmed', 'waitlist') AND NEW.status IN ('cancelled', 'completed') THEN
      UPDATE public.course_sessions 
      SET available_spots = available_spots + 1
      WHERE id = NEW.session_id;
    -- If booking was cancelled and now confirmed, remove spot
    ELSIF OLD.status IN ('cancelled', 'completed') AND NEW.status IN ('confirmed', 'waitlist') THEN
      UPDATE public.course_sessions 
      SET available_spots = available_spots - 1
      WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' AND OLD.session_id IS NOT NULL THEN
    UPDATE public.course_sessions 
    SET available_spots = available_spots + 1
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add triggers for automatic spot management
CREATE TRIGGER update_session_spots_on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_session_available_spots();

-- Add unique constraint to prevent duplicate sessions
ALTER TABLE public.course_sessions ADD CONSTRAINT unique_course_session_datetime 
UNIQUE (course_id, session_date, start_time);