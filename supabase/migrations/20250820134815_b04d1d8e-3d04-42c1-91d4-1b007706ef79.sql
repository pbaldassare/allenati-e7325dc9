-- Create table for course schedule exceptions
CREATE TABLE public.course_schedule_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on course_schedule_exceptions
ALTER TABLE public.course_schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- Create policies for course_schedule_exceptions
CREATE POLICY "Admins can manage all course exceptions" 
ON public.course_schedule_exceptions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gym owners can manage their gym course exceptions" 
ON public.course_schedule_exceptions 
FOR ALL 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  course_id IN (
    SELECT courses.id 
    FROM courses 
    WHERE courses.gym_id = get_user_gym_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  course_id IN (
    SELECT courses.id 
    FROM courses 
    WHERE courses.gym_id = get_user_gym_id(auth.uid())
  )
);

CREATE POLICY "Instructors can manage their course exceptions" 
ON public.course_schedule_exceptions 
FOR ALL 
USING (
  has_role(auth.uid(), 'instructor'::app_role) AND 
  course_id IN (
    SELECT c.id 
    FROM courses c 
    JOIN instructors i ON c.instructor_id = i.id 
    WHERE i.user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'instructor'::app_role) AND 
  course_id IN (
    SELECT c.id 
    FROM courses c 
    JOIN instructors i ON c.instructor_id = i.id 
    WHERE i.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view course exceptions" 
ON public.course_schedule_exceptions 
FOR SELECT 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_course_schedule_exceptions_updated_at
BEFORE UPDATE ON public.course_schedule_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate course sessions with exceptions
CREATE OR REPLACE FUNCTION public.generate_course_sessions_with_exceptions(_course_id uuid, _start_date date, _end_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  schedule_record RECORD;
  iter_date DATE;
  session_count INTEGER := 0;
  course_max_participants INTEGER;
  is_exception BOOLEAN;
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
      -- Check if this date falls within any exception period
      SELECT EXISTS (
        SELECT 1 FROM public.course_schedule_exceptions 
        WHERE course_id = _course_id 
        AND iter_date >= start_date 
        AND iter_date <= end_date
      ) INTO is_exception;
      
      -- Only create session if not in exception period
      IF NOT is_exception THEN
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
      END IF;
      
      iter_date := iter_date + INTERVAL '7 days';
    END LOOP;
  END LOOP;
  
  RETURN session_count;
END;
$function$;

-- Create function for manual enrollment by staff
CREATE OR REPLACE FUNCTION public.manual_enroll_user(_user_id uuid, _session_id uuid, _enrolled_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  _booking_id uuid;
  _course_id uuid;
  _session_date date;
  _session_time time;
  _credits_required integer;
  _available_spots integer;
BEGIN
  -- Check if enrolling user has permission
  IF NOT (has_role(_enrolled_by, 'admin'::app_role) OR 
          has_role(_enrolled_by, 'gym_owner'::app_role) OR 
          has_role(_enrolled_by, 'instructor'::app_role)) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Get session details
  SELECT course_id, session_date, start_time, available_spots
  INTO _course_id, _session_date, _session_time, _available_spots
  FROM public.course_sessions
  WHERE id = _session_id;
  
  -- Check if spots available
  IF _available_spots <= 0 THEN
    RAISE EXCEPTION 'No available spots for this session';
  END IF;
  
  -- Get course credits required
  SELECT credits_required INTO _credits_required
  FROM public.courses
  WHERE id = _course_id;
  
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
    _credits_required,
    'Manual enrollment by staff'
  ) RETURNING id INTO _booking_id;
  
  -- Deduct credits from user (handled by trigger)
  INSERT INTO public.credits_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    description,
    reference_id
  ) VALUES (
    _user_id,
    -_credits_required,
    (SELECT COALESCE(current_credits, 0) - _credits_required FROM profiles WHERE user_id = _user_id),
    'booking',
    'Manual enrollment - ' || (SELECT name FROM courses WHERE id = _course_id),
    _booking_id
  );
  
  RETURN _booking_id;
END;
$function$;