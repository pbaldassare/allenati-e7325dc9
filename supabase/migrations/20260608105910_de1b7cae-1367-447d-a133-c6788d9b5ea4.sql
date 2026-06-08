
-- 1. Trigger to auto-link orphan bookings when a session is created (or updated to scheduled)
CREATE OR REPLACE FUNCTION public.relink_orphan_bookings_to_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bookings b
     SET session_id = NEW.id
   WHERE b.session_id IS NULL
     AND b.course_id = NEW.course_id
     AND b.scheduled_date = NEW.session_date
     AND b.scheduled_time = NEW.start_time
     AND b.status IN ('confirmed', 'waitlist');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_relink_orphan_bookings ON public.course_sessions;
CREATE TRIGGER trg_relink_orphan_bookings
AFTER INSERT ON public.course_sessions
FOR EACH ROW
EXECUTE FUNCTION public.relink_orphan_bookings_to_session();

-- 2. Backfill: ricollega tutte le prenotazioni orfane esistenti
UPDATE bookings b
   SET session_id = s.id
  FROM course_sessions s
 WHERE b.session_id IS NULL
   AND s.course_id = b.course_id
   AND s.session_date = b.scheduled_date
   AND s.start_time  = b.scheduled_time;

-- 3. Ricalcola available_spots per sessioni future
UPDATE course_sessions s
   SET available_spots = GREATEST(
         0,
         s.max_participants - COALESCE((
           SELECT COUNT(*) FROM bookings b
            WHERE b.session_id = s.id AND b.status = 'confirmed'
         ), 0)
       )
 WHERE s.session_date >= CURRENT_DATE
   AND s.status = 'scheduled';
