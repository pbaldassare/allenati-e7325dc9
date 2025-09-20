-- Add consolidated data fields to bookings table for data preservation
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS course_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS instructor_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS gym_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS room_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS is_consolidated BOOLEAN DEFAULT false;

-- Add consolidated data fields to booking_history for audit trail
ALTER TABLE public.booking_history
ADD COLUMN IF NOT EXISTS course_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS instructor_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS gym_name_snapshot TEXT,
ADD COLUMN IF NOT EXISTS original_booking_data JSONB;

-- Create function to consolidate booking data
CREATE OR REPLACE FUNCTION public.consolidate_booking_data()
RETURNS TRIGGER AS $$
DECLARE
  course_data RECORD;
  instructor_data RECORD;
  gym_data RECORD;
  session_data RECORD;
BEGIN
  -- Only consolidate if not already done
  IF NEW.is_consolidated = true THEN
    RETURN NEW;
  END IF;

  -- Get course information
  SELECT c.name, c.gym_id, c.instructor_id
  INTO course_data
  FROM public.courses c 
  WHERE c.id = NEW.course_id;

  -- Get instructor information if available
  IF course_data.instructor_id IS NOT NULL THEN
    SELECT COALESCE(i.first_name || ' ' || i.last_name, 'Istruttore sconosciuto') as name
    INTO instructor_data
    FROM public.instructors i 
    WHERE i.id = course_data.instructor_id;
  END IF;

  -- Get gym information
  SELECT g.name
  INTO gym_data
  FROM public.gyms g 
  WHERE g.id = course_data.gym_id;

  -- Get session room information if available
  IF NEW.session_id IS NOT NULL THEN
    SELECT COALESCE(cs.room_name, gr.name, 'Sala non specificata') as room_name
    INTO session_data
    FROM public.course_sessions cs
    LEFT JOIN public.gym_rooms gr ON cs.room_id = gr.id
    WHERE cs.id = NEW.session_id;
  END IF;

  -- Update the booking with consolidated data
  NEW.course_name_snapshot := course_data.name;
  NEW.instructor_name_snapshot := instructor_data.name;
  NEW.gym_name_snapshot := gym_data.name;
  NEW.room_name_snapshot := session_data.room_name;
  NEW.is_consolidated := true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-consolidate booking data on insert/update
CREATE OR REPLACE TRIGGER consolidate_booking_data_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.consolidate_booking_data();

-- Create function to preserve booking data in history
CREATE OR REPLACE FUNCTION public.preserve_booking_in_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Store original booking data when status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.booking_history (
      booking_id,
      old_status,
      new_status,
      changed_by,
      change_reason,
      course_name_snapshot,
      instructor_name_snapshot,
      gym_name_snapshot,
      original_booking_data
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NEW.cancellation_reason,
      NEW.course_name_snapshot,
      NEW.instructor_name_snapshot,
      NEW.gym_name_snapshot,
      jsonb_build_object(
        'scheduled_date', NEW.scheduled_date,
        'scheduled_time', NEW.scheduled_time,
        'credits_used', NEW.credits_used,
        'room_name', NEW.room_name_snapshot,
        'created_at', NEW.created_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking history preservation
CREATE OR REPLACE TRIGGER preserve_booking_history_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_booking_in_history();

-- Consolidate existing bookings data
UPDATE public.bookings 
SET is_consolidated = false 
WHERE is_consolidated IS NULL OR is_consolidated = false;

-- Create view for consolidated booking analytics
CREATE OR REPLACE VIEW public.booking_analytics AS
SELECT 
  b.id,
  b.user_id,
  b.course_id,
  b.scheduled_date,
  b.scheduled_time,
  b.status,
  b.credits_used,
  b.created_at,
  b.cancelled_at,
  b.cancellation_reason,
  -- Use consolidated data if available, fallback to live data
  COALESCE(b.course_name_snapshot, c.name) as course_name,
  COALESCE(b.instructor_name_snapshot, CONCAT(i.first_name, ' ', i.last_name)) as instructor_name,
  COALESCE(b.gym_name_snapshot, g.name) as gym_name,
  COALESCE(b.room_name_snapshot, cs.room_name, gr.name) as room_name,
  b.is_consolidated,
  -- User data (always live)
  p.first_name as user_first_name,
  p.last_name as user_last_name,
  p.email as user_email,
  p.phone as user_phone,
  -- Additional analytics fields
  EXTRACT(YEAR FROM b.scheduled_date) as booking_year,
  EXTRACT(MONTH FROM b.scheduled_date) as booking_month,
  EXTRACT(WEEK FROM b.scheduled_date) as booking_week,
  EXTRACT(DOW FROM b.scheduled_date) as booking_day_of_week
FROM public.bookings b
LEFT JOIN public.courses c ON b.course_id = c.id
LEFT JOIN public.instructors i ON c.instructor_id = i.id
LEFT JOIN public.gyms g ON c.gym_id = g.id
LEFT JOIN public.course_sessions cs ON b.session_id = cs.id
LEFT JOIN public.gym_rooms gr ON cs.room_id = gr.id
LEFT JOIN public.profiles p ON b.user_id = p.user_id;

-- Create view for booking analytics with user aggregations
CREATE OR REPLACE VIEW public.user_booking_analytics AS
SELECT 
  ba.user_id,
  ba.user_first_name,
  ba.user_last_name,
  ba.user_email,
  ba.gym_name,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE ba.status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE ba.status = 'completed') as completed_bookings,
  COUNT(*) FILTER (WHERE ba.status = 'cancelled') as cancelled_bookings,
  COUNT(*) FILTER (WHERE ba.status = 'no_show') as no_show_bookings,
  SUM(ba.credits_used) as total_credits_used,
  MIN(ba.created_at) as first_booking_date,
  MAX(ba.created_at) as last_booking_date,
  COUNT(DISTINCT ba.course_id) as unique_courses_booked,
  AVG(ba.credits_used) as avg_credits_per_booking
FROM public.booking_analytics ba
GROUP BY 
  ba.user_id, 
  ba.user_first_name, 
  ba.user_last_name, 
  ba.user_email,
  ba.gym_name;