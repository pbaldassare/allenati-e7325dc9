-- Add deadline_hours to courses table
ALTER TABLE public.courses 
ADD COLUMN deadline_hours NUMERIC DEFAULT 24.0;

-- Create gym_rooms table
CREATE TABLE public.gym_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on gym_rooms
ALTER TABLE public.gym_rooms ENABLE ROW LEVEL SECURITY;

-- Add room_id to course_schedules
ALTER TABLE public.course_schedules 
ADD COLUMN room_id UUID;

-- Create function to check if user can manage bookings without deadline restrictions
CREATE OR REPLACE FUNCTION public.can_manage_booking_without_deadline(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'gym_owner', 'instructor')
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Create function to check booking deadline
CREATE OR REPLACE FUNCTION public.can_book_within_deadline(_course_id UUID, _scheduled_datetime TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN can_manage_booking_without_deadline(auth.uid()) THEN true
      ELSE (
        SELECT 
          (_scheduled_datetime - INTERVAL '1 hour' * COALESCE(deadline_hours, 24)) > now()
        FROM public.courses 
        WHERE id = _course_id
      )
    END
$$;

-- Create RLS policies for gym_rooms
CREATE POLICY "Users can view active gym rooms" 
ON public.gym_rooms 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Gym owners can manage their gym rooms" 
ON public.gym_rooms 
FOR ALL 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = get_user_gym_id(auth.uid()));

CREATE POLICY "Admins can manage all gym rooms" 
ON public.gym_rooms 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update courses RLS policies for instructors
DROP POLICY IF EXISTS "Instructors can manage their courses" ON public.courses;
CREATE POLICY "Instructors can manage their gym courses" 
ON public.courses 
FOR ALL 
USING (
  has_role(auth.uid(), 'instructor'::app_role) 
  AND gym_id = get_user_gym_id(auth.uid())
  AND instructor_id IN (
    SELECT instructors.id
    FROM instructors
    WHERE instructors.user_id = auth.uid()
  )
);

-- Add trigger for gym_rooms updated_at
CREATE TRIGGER update_gym_rooms_updated_at
BEFORE UPDATE ON public.gym_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default rooms for existing gyms
INSERT INTO public.gym_rooms (gym_id, name, description)
SELECT 
  id as gym_id,
  'Sala ' || room_num as name,
  'Sala ' || room_num || ' - ' || name as description
FROM public.gyms,
LATERAL (VALUES (1), (2), (3)) AS rooms(room_num)
WHERE is_active = true;