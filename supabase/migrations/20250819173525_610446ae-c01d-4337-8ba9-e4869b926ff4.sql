-- Create course_sessions table for managing specific course dates and times
CREATE TABLE public.course_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_id UUID REFERENCES public.gym_rooms(id),
  room_name TEXT,
  max_participants INTEGER NOT NULL DEFAULT 20,
  available_spots INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for course_sessions
ALTER TABLE public.course_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all course sessions
CREATE POLICY "Admins can manage all course sessions" 
ON public.course_sessions 
FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Gym owners can manage sessions for their gym courses
CREATE POLICY "Gym owners can manage their gym course sessions" 
ON public.course_sessions 
FOR ALL 
TO authenticated 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  course_id IN (
    SELECT id FROM courses WHERE gym_id = get_user_gym_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  course_id IN (
    SELECT id FROM courses WHERE gym_id = get_user_gym_id(auth.uid())
  )
);

-- Instructors can manage sessions for their courses
CREATE POLICY "Instructors can manage their course sessions" 
ON public.course_sessions 
FOR ALL 
TO authenticated 
USING (
  has_role(auth.uid(), 'instructor'::app_role) AND 
  course_id IN (
    SELECT c.id FROM courses c
    JOIN instructors i ON c.instructor_id = i.id
    WHERE i.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'instructor'::app_role) AND 
  course_id IN (
    SELECT c.id FROM courses c
    JOIN instructors i ON c.instructor_id = i.id
    WHERE i.user_id = auth.uid()
  )
);

-- Users can view active course sessions
CREATE POLICY "Users can view active course sessions" 
ON public.course_sessions 
FOR SELECT 
TO authenticated 
USING (status = 'scheduled');

-- Add updated_at trigger
CREATE TRIGGER update_course_sessions_updated_at
BEFORE UPDATE ON public.course_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add session_id to bookings table (keeping course_id for backward compatibility)
ALTER TABLE public.bookings ADD COLUMN session_id UUID REFERENCES public.course_sessions(id) ON DELETE SET NULL;

-- Add courses table fields for date management
ALTER TABLE public.courses ADD COLUMN start_date DATE;
ALTER TABLE public.courses ADD COLUMN end_date DATE;
ALTER TABLE public.courses ADD COLUMN auto_generate_sessions BOOLEAN NOT NULL DEFAULT true;

-- Function to generate course sessions automatically
CREATE OR REPLACE FUNCTION public.generate_course_sessions(_course_id UUID, _start_date DATE, _end_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule_record RECORD;
  current_date DATE;
  session_count INTEGER := 0;
  room_record RECORD;
BEGIN
  -- Get course details
  SELECT max_participants INTO room_record FROM courses WHERE id = _course_id;
  
  -- Loop through each schedule for the course
  FOR schedule_record IN 
    SELECT day_of_week, start_time, end_time, room_id, room_name 
    FROM course_schedules 
    WHERE course_id = _course_id AND is_active = true
  LOOP
    -- Start from the start_date
    current_date := _start_date;
    
    -- Find the first occurrence of the target day of week
    WHILE EXTRACT(DOW FROM current_date) != schedule_record.day_of_week LOOP
      current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    -- Generate sessions for this day of week until end_date
    WHILE current_date <= _end_date LOOP
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
        current_date,
        schedule_record.start_time,
        schedule_record.end_time,
        schedule_record.room_id,
        schedule_record.room_name,
        room_record.max_participants,
        room_record.max_participants
      );
      
      session_count := session_count + 1;
      current_date := current_date + INTERVAL '7 days';
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