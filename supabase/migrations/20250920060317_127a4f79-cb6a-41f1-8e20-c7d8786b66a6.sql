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

-- Create function to consolidate booking data (fixed version)
CREATE OR REPLACE FUNCTION public.consolidate_booking_data()
RETURNS TRIGGER AS $$
DECLARE
  course_data RECORD;
  instructor_name TEXT;
  gym_name TEXT;
  room_name TEXT;
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

  -- Get instructor name if available
  IF course_data.instructor_id IS NOT NULL THEN
    SELECT COALESCE(i.first_name || ' ' || i.last_name, 'Istruttore sconosciuto')
    INTO instructor_name
    FROM public.instructors i 
    WHERE i.id = course_data.instructor_id;
  ELSE
    instructor_name := 'Istruttore non assegnato';
  END IF;

  -- Get gym name
  SELECT g.name
  INTO gym_name
  FROM public.gyms g 
  WHERE g.id = course_data.gym_id;

  -- Get session room name if available
  IF NEW.session_id IS NOT NULL THEN
    SELECT COALESCE(cs.room_name, gr.name, 'Sala non specificata')
    INTO room_name
    FROM public.course_sessions cs
    LEFT JOIN public.gym_rooms gr ON cs.room_id = gr.id
    WHERE cs.id = NEW.session_id;
  ELSE
    room_name := 'Sala non specificata';
  END IF;

  -- Update the booking with consolidated data
  NEW.course_name_snapshot := course_data.name;
  NEW.instructor_name_snapshot := instructor_name;
  NEW.gym_name_snapshot := gym_name;
  NEW.room_name_snapshot := room_name;
  NEW.is_consolidated := true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-consolidate booking data on insert/update
DROP TRIGGER IF EXISTS consolidate_booking_data_trigger ON public.bookings;
CREATE TRIGGER consolidate_booking_data_trigger
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
DROP TRIGGER IF EXISTS preserve_booking_history_trigger ON public.bookings;
CREATE TRIGGER preserve_booking_history_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_booking_in_history();

-- Consolidate existing bookings data
UPDATE public.bookings 
SET is_consolidated = false 
WHERE is_consolidated IS NULL OR is_consolidated = false;