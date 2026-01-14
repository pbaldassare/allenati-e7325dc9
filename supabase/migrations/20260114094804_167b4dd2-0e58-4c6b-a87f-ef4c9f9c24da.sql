-- Update smart_generate_sessions_with_weeks to also sync times for sessions that match schedule day but have different times
CREATE OR REPLACE FUNCTION public.smart_generate_sessions_with_weeks(
    p_course_id uuid, 
    p_schedules jsonb DEFAULT NULL::jsonb, 
    p_duration_weeks integer DEFAULT 12, 
    p_start_date date DEFAULT NULL::date, 
    p_max_participants integer DEFAULT NULL::integer
)
RETURNS TABLE(success boolean, sessions_created integer, sessions_cancelled integer, sessions_deleted integer, affected_bookings integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_course record;
    v_schedule record;
    v_session_date date;
    v_start_date date;
    v_end_date date;
    v_created_count integer := 0;
    v_cancelled_count integer := 0;
    v_deleted_count integer := 0;
    v_booking_count integer := 0;
    v_updated_count integer := 0;
    v_max_participants integer;
    v_existing_session record;
    v_active_schedule_keys text[];
    v_schedule_key text;
BEGIN
    RAISE NOTICE '[SAFE-P] Starting smart session generation for course %', p_course_id;
    
    SELECT * INTO v_course FROM courses WHERE id = p_course_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, 0, 0, 'Corso non trovato'::text;
        RETURN;
    END IF;
    
    v_max_participants := COALESCE(p_max_participants, v_course.max_participants, 10);
    
    IF p_schedules IS NOT NULL THEN
        -- FIX: DELETE instead of UPDATE to avoid constraint violation
        DELETE FROM course_schedules WHERE course_id = p_course_id;
        
        INSERT INTO course_schedules (
            course_id, day_of_week, start_time, end_time,
            room_id, room_name, max_participants_override,
            difficulty_level_override, is_active
        )
        SELECT 
            p_course_id,
            (s->>'day_of_week')::integer,
            (s->>'start_time')::time,
            (s->>'end_time')::time,
            NULLIF(s->>'room_id', '')::uuid,
            s->>'room_name',
            (s->>'max_participants_override')::integer,
            (s->>'difficulty_level_override')::integer,
            true
        FROM jsonb_array_elements(p_schedules) AS s;
    END IF;
    
    v_start_date := COALESCE(p_start_date, CURRENT_DATE);
    v_end_date := v_start_date + (p_duration_weeks * 7);
    
    RAISE NOTICE '[SAFE-P] Date range: % to %', v_start_date, v_end_date;
    
    -- NEW: First, sync existing future sessions with updated schedule times
    -- This handles the case where schedule times changed but day remains the same
    UPDATE course_sessions cs
    SET 
        start_time = sched.start_time,
        end_time = sched.end_time,
        room_id = sched.room_id,
        room_name = sched.room_name,
        updated_at = now()
    FROM course_schedules sched
    WHERE cs.course_id = p_course_id
      AND sched.course_id = p_course_id
      AND sched.is_active = true
      AND EXTRACT(DOW FROM cs.session_date) = sched.day_of_week
      AND cs.session_date >= v_start_date
      AND cs.status = 'scheduled'
      AND (cs.start_time != sched.start_time OR cs.end_time != sched.end_time);
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '[SAFE-P] Updated % existing sessions with new times', v_updated_count;
    
    -- Build new schedule keys AFTER updating times
    SELECT array_agg(
        cs.day_of_week::text || '_' || to_char(cs.start_time, 'HH24:MI')
    ) INTO v_active_schedule_keys
    FROM course_schedules cs
    WHERE cs.course_id = p_course_id AND cs.is_active = true;
    
    RAISE NOTICE '[SAFE-P] Active schedule keys: %', v_active_schedule_keys;
    
    -- Handle existing sessions that NO LONGER match active schedules
    FOR v_existing_session IN 
        SELECT cs.id, cs.session_date, cs.start_time,
               EXTRACT(DOW FROM cs.session_date)::text || '_' || to_char(cs.start_time, 'HH24:MI') as schedule_key
        FROM course_sessions cs
        WHERE cs.course_id = p_course_id 
          AND cs.session_date >= v_start_date
          AND cs.status = 'scheduled'
    LOOP
        v_schedule_key := v_existing_session.schedule_key;
        
        IF v_active_schedule_keys IS NULL OR NOT (v_schedule_key = ANY(v_active_schedule_keys)) THEN
            IF EXISTS (
                SELECT 1 FROM bookings b 
                WHERE b.session_id = v_existing_session.id 
                  AND b.status IN ('confirmed', 'waitlist')
            ) THEN
                UPDATE course_sessions SET status = 'cancelled' WHERE id = v_existing_session.id;
                v_cancelled_count := v_cancelled_count + 1;
                
                SELECT COUNT(*) INTO v_booking_count 
                FROM bookings 
                WHERE session_id = v_existing_session.id AND status IN ('confirmed', 'waitlist');
                
                RAISE NOTICE '[SAFE-P] Cancelled session % with % bookings', v_existing_session.id, v_booking_count;
            ELSE
                DELETE FROM course_sessions WHERE id = v_existing_session.id;
                v_deleted_count := v_deleted_count + 1;
                RAISE NOTICE '[SAFE-P] Deleted empty session %', v_existing_session.id;
            END IF;
        END IF;
    END LOOP;
    
    -- Generate new sessions for active schedules
    FOR v_schedule IN
        SELECT cs.*, 
               COALESCE(cs.max_participants_override, v_max_participants) as effective_max
        FROM course_schedules cs
        WHERE cs.course_id = p_course_id AND cs.is_active = true
    LOOP
        v_session_date := v_start_date;
        
        -- Find first occurrence of target day
        WHILE EXTRACT(DOW FROM v_session_date) != v_schedule.day_of_week LOOP
            v_session_date := v_session_date + 1;
        END LOOP;
        
        -- Create sessions weekly
        WHILE v_session_date <= v_end_date LOOP
            -- Skip if session already exists (either same date+time or same date+day)
            IF NOT EXISTS (
                SELECT 1 FROM course_sessions 
                WHERE course_id = p_course_id 
                  AND session_date = v_session_date
                  AND start_time = v_schedule.start_time
            ) THEN
                INSERT INTO course_sessions (
                    course_id, session_date, start_time, end_time,
                    room_id, room_name, max_participants, available_spots, status
                ) VALUES (
                    p_course_id, v_session_date, v_schedule.start_time, v_schedule.end_time,
                    v_schedule.room_id, v_schedule.room_name,
                    v_schedule.effective_max, v_schedule.effective_max, 'scheduled'
                );
                v_created_count := v_created_count + 1;
                RAISE NOTICE '[SAFE-P] Created session for % at %', v_session_date, v_schedule.start_time;
            END IF;
            
            v_session_date := v_session_date + 7;
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT 
        true, 
        v_created_count, 
        v_cancelled_count, 
        v_deleted_count, 
        v_booking_count,
        format('Creati: %s, Cancellati: %s, Eliminati: %s, Aggiornati: %s', 
               v_created_count, v_cancelled_count, v_deleted_count, v_updated_count)::text;
END;
$function$;