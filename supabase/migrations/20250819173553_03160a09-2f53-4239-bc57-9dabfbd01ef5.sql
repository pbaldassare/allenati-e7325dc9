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