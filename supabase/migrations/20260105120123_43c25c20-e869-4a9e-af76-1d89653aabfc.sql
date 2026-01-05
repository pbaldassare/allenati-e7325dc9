-- Rewrite smart_generate_sessions_with_weeks to be SAFE
-- Instead of deleting all sessions, it now:
-- 1. Keeps sessions that match active schedules
-- 2. Sets status='cancelled' for sessions with bookings that no longer match
-- 3. Only deletes sessions without bookings that no longer match

CREATE OR REPLACE FUNCTION public.smart_generate_sessions_with_weeks(
  p_course_id uuid,
  p_schedules jsonb,
  p_duration_weeks integer DEFAULT 12,
  p_start_date date DEFAULT CURRENT_DATE,
  p_max_participants integer DEFAULT 10
)
RETURNS jsonb AS $$
DECLARE
  v_schedule jsonb;
  v_session_date date;
  v_end_date date;
  v_day_of_week integer;
  v_start_time time;
  v_end_time time;
  v_room_id uuid;
  v_room_name text;
  v_max_parts integer;
  v_difficulty integer;
  v_sessions_created integer := 0;
  v_sessions_deleted integer := 0;
  v_sessions_cancelled integer := 0;
  v_affected_bookings integer := 0;
  v_existing_session record;
  v_has_bookings boolean;
  v_schedule_key text;
  v_active_schedule_keys text[] := ARRAY[]::text[];
BEGIN
  -- Calculate end date
  v_end_date := p_start_date + (p_duration_weeks * 7);
  
  -- First, build array of active schedule keys (day_of_week + start_time + room_id)
  FOR v_schedule IN SELECT * FROM jsonb_array_elements(p_schedules)
  LOOP
    v_day_of_week := (v_schedule->>'day_of_week')::integer;
    v_start_time := (v_schedule->>'start_time')::time;
    v_room_id := (v_schedule->>'room_id')::uuid;
    
    v_schedule_key := v_day_of_week::text || '_' || v_start_time::text || '_' || COALESCE(v_room_id::text, 'null');
    v_active_schedule_keys := array_append(v_active_schedule_keys, v_schedule_key);
  END LOOP;
  
  -- Process existing future sessions: cancel those with bookings, delete those without
  FOR v_existing_session IN 
    SELECT cs.id, cs.session_date, cs.start_time, cs.room_id,
           EXTRACT(DOW FROM cs.session_date)::integer as dow,
           EXISTS (
             SELECT 1 FROM bookings b 
             WHERE b.session_id = cs.id 
             AND b.status IN ('confirmed', 'checked_in')
           ) as has_confirmed_bookings
    FROM course_sessions cs
    WHERE cs.course_id = p_course_id
      AND cs.session_date >= CURRENT_DATE
      AND cs.status != 'cancelled'
  LOOP
    -- Build key for this existing session
    v_schedule_key := v_existing_session.dow::text || '_' || 
                      v_existing_session.start_time::text || '_' || 
                      COALESCE(v_existing_session.room_id::text, 'null');
    
    -- Check if this session still matches an active schedule
    IF NOT v_schedule_key = ANY(v_active_schedule_keys) THEN
      -- Session no longer matches any schedule
      IF v_existing_session.has_confirmed_bookings THEN
        -- Has bookings: CANCEL instead of delete
        UPDATE course_sessions 
        SET status = 'cancelled',
            notes = COALESCE(notes || E'\n', '') || 'Sessione annullata per modifica orari - ' || now()::text,
            updated_at = now()
        WHERE id = v_existing_session.id;
        
        v_sessions_cancelled := v_sessions_cancelled + 1;
        
        -- Count affected bookings
        SELECT COUNT(*) INTO v_affected_bookings 
        FROM bookings 
        WHERE session_id = v_existing_session.id 
        AND status IN ('confirmed', 'checked_in');
        
      ELSE
        -- No bookings: safe to delete
        DELETE FROM course_sessions WHERE id = v_existing_session.id;
        v_sessions_deleted := v_sessions_deleted + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- Now generate new sessions for each schedule
  FOR v_schedule IN SELECT * FROM jsonb_array_elements(p_schedules)
  LOOP
    v_day_of_week := (v_schedule->>'day_of_week')::integer;
    v_start_time := (v_schedule->>'start_time')::time;
    v_end_time := (v_schedule->>'end_time')::time;
    v_room_id := (v_schedule->>'room_id')::uuid;
    v_room_name := v_schedule->>'room_name';
    v_max_parts := COALESCE((v_schedule->>'max_participants_override')::integer, p_max_participants);
    v_difficulty := (v_schedule->>'difficulty_level_override')::integer;
    
    -- Generate sessions for this schedule
    v_session_date := p_start_date;
    
    -- Find first matching day
    WHILE EXTRACT(DOW FROM v_session_date)::integer != v_day_of_week AND v_session_date < v_end_date
    LOOP
      v_session_date := v_session_date + 1;
    END LOOP;
    
    -- Generate weekly sessions
    WHILE v_session_date < v_end_date
    LOOP
      -- Insert only if not exists (uses unique constraint)
      BEGIN
        INSERT INTO course_sessions (
          course_id,
          session_date,
          start_time,
          end_time,
          room_id,
          room_name,
          max_participants,
          available_spots,
          difficulty_level,
          status
        ) VALUES (
          p_course_id,
          v_session_date,
          v_start_time,
          v_end_time,
          v_room_id,
          v_room_name,
          v_max_parts,
          v_max_parts,
          v_difficulty,
          'scheduled'
        );
        v_sessions_created := v_sessions_created + 1;
      EXCEPTION WHEN unique_violation THEN
        -- Session already exists, update it instead
        UPDATE course_sessions 
        SET end_time = v_end_time,
            room_id = v_room_id,
            room_name = v_room_name,
            max_participants = v_max_parts,
            difficulty_level = v_difficulty,
            status = CASE WHEN status = 'cancelled' THEN 'scheduled' ELSE status END,
            updated_at = now()
        WHERE course_id = p_course_id
          AND session_date = v_session_date
          AND start_time = v_start_time;
      END;
      
      v_session_date := v_session_date + 7;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'sessions_created', v_sessions_created,
    'sessions_deleted', v_sessions_deleted,
    'sessions_cancelled', v_sessions_cancelled,
    'affected_bookings', v_affected_bookings
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;