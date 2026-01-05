-- Function to repair orphan bookings (session_id = NULL)
-- This function finds bookings without a session link and either:
-- 1. Links them to an existing session with matching date/time
-- 2. Creates a placeholder cancelled session and links them

CREATE OR REPLACE FUNCTION public.repair_orphan_bookings(
  _course_id uuid DEFAULT NULL
)
RETURNS TABLE(
  repaired_count integer,
  sessions_created integer,
  sessions_relinked integer
) AS $$
DECLARE
  v_repaired_count integer := 0;
  v_sessions_created integer := 0;
  v_sessions_relinked integer := 0;
  v_booking record;
  v_session_id uuid;
  v_course record;
BEGIN
  -- Loop through all orphan bookings
  FOR v_booking IN 
    SELECT b.id, b.course_id, b.scheduled_date, b.scheduled_time, b.user_id,
           c.duration_minutes, c.max_participants, c.gym_id
    FROM bookings b
    JOIN courses c ON c.id = b.course_id
    WHERE b.session_id IS NULL
      AND (_course_id IS NULL OR b.course_id = _course_id)
  LOOP
    -- Try to find an existing session with matching date/time
    SELECT id INTO v_session_id
    FROM course_sessions
    WHERE course_id = v_booking.course_id
      AND session_date = v_booking.scheduled_date
      AND start_time = v_booking.scheduled_time
    LIMIT 1;
    
    IF v_session_id IS NOT NULL THEN
      -- Session exists, just relink the booking
      UPDATE bookings 
      SET session_id = v_session_id,
          updated_at = now()
      WHERE id = v_booking.id;
      
      v_sessions_relinked := v_sessions_relinked + 1;
    ELSE
      -- No session exists, create a placeholder cancelled session
      INSERT INTO course_sessions (
        course_id,
        session_date,
        start_time,
        end_time,
        max_participants,
        available_spots,
        status,
        notes
      ) VALUES (
        v_booking.course_id,
        v_booking.scheduled_date,
        v_booking.scheduled_time,
        (v_booking.scheduled_time::time + (v_booking.duration_minutes || ' minutes')::interval)::time,
        v_booking.max_participants,
        0,
        'cancelled',
        'Sessione creata automaticamente per preservare storico prenotazioni'
      )
      RETURNING id INTO v_session_id;
      
      -- Link the booking to the new session
      UPDATE bookings 
      SET session_id = v_session_id,
          updated_at = now()
      WHERE id = v_booking.id;
      
      v_sessions_created := v_sessions_created + 1;
    END IF;
    
    v_repaired_count := v_repaired_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_repaired_count, v_sessions_created, v_sessions_relinked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;