-- Prima droppiamo TUTTE le versioni della funzione
DROP FUNCTION IF EXISTS smart_generate_sessions_with_weeks(uuid, integer, date, jsonb);
DROP FUNCTION IF EXISTS smart_generate_sessions_with_weeks(uuid, jsonb, integer, date, integer);

-- Creiamo la funzione SAFE principale (p_* parameters)
CREATE OR REPLACE FUNCTION smart_generate_sessions_with_weeks(
    p_course_id uuid,
    p_schedules jsonb DEFAULT NULL,
    p_duration_weeks integer DEFAULT 12,
    p_start_date date DEFAULT NULL,
    p_max_participants integer DEFAULT NULL
)
RETURNS TABLE (
    success boolean,
    sessions_created integer,
    sessions_cancelled integer,
    sessions_deleted integer,
    affected_bookings integer,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        UPDATE course_schedules SET is_active = false WHERE course_id = p_course_id;
        
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
    
    SELECT array_agg(
        cs.day_of_week::text || '_' || to_char(cs.start_time, 'HH24:MI')
    ) INTO v_active_schedule_keys
    FROM course_schedules cs
    WHERE cs.course_id = p_course_id AND cs.is_active = true;
    
    RAISE NOTICE '[SAFE-P] Active schedule keys: %', v_active_schedule_keys;
    
    -- Handle existing sessions that NO LONGER match active schedules
    FOR v_existing_session IN 
        SELECT cs.id, cs.session_date, cs.start_time,
               EXTRACT(DOW FROM cs.session_date)::integer as dow,
               (SELECT COUNT(*) FROM bookings b WHERE b.session_id = cs.id AND b.status IN ('confirmed', 'waitlist')) as booking_count
        FROM course_sessions cs
        WHERE cs.course_id = p_course_id 
          AND cs.session_date >= v_start_date
          AND cs.status IN ('scheduled', 'hidden')
    LOOP
        v_schedule_key := v_existing_session.dow::text || '_' || to_char(v_existing_session.start_time, 'HH24:MI');
        
        IF v_schedule_key = ANY(v_active_schedule_keys) THEN
            CONTINUE;
        ELSE
            IF v_existing_session.booking_count > 0 THEN
                UPDATE course_sessions 
                SET status = 'cancelled',
                    notes = COALESCE(notes || E'\n', '') || 'Annullata: orario rimosso'
                WHERE id = v_existing_session.id;
                v_cancelled_count := v_cancelled_count + 1;
                v_booking_count := v_booking_count + v_existing_session.booking_count;
            ELSE
                DELETE FROM course_sessions WHERE id = v_existing_session.id;
                v_deleted_count := v_deleted_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    -- Generate NEW sessions for active schedules
    FOR v_schedule IN 
        SELECT * FROM course_schedules 
        WHERE course_id = p_course_id AND is_active = true
    LOOP
        v_session_date := v_start_date;
        
        WHILE v_session_date <= v_end_date LOOP
            IF EXTRACT(DOW FROM v_session_date)::integer = v_schedule.day_of_week THEN
                IF NOT EXISTS (
                    SELECT 1 FROM course_sessions cs
                    WHERE cs.course_id = p_course_id
                      AND cs.session_date = v_session_date
                      AND to_char(cs.start_time, 'HH24:MI') = to_char(v_schedule.start_time, 'HH24:MI')
                      AND cs.status IN ('scheduled', 'hidden', 'completed')
                ) THEN
                    INSERT INTO course_sessions (
                        course_id, session_date, start_time, end_time,
                        room_id, room_name, max_participants, available_spots,
                        difficulty_level, status
                    ) VALUES (
                        p_course_id, v_session_date, v_schedule.start_time, v_schedule.end_time,
                        v_schedule.room_id, v_schedule.room_name,
                        COALESCE(v_schedule.max_participants_override, v_max_participants),
                        COALESCE(v_schedule.max_participants_override, v_max_participants),
                        v_schedule.difficulty_level_override,
                        'scheduled'
                    );
                    v_created_count := v_created_count + 1;
                END IF;
            END IF;
            v_session_date := v_session_date + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '[SAFE-P] Complete: created=%, cancelled=%, deleted=%', v_created_count, v_cancelled_count, v_deleted_count;
    
    RETURN QUERY SELECT 
        true,
        v_created_count,
        v_cancelled_count,
        v_deleted_count,
        v_booking_count,
        format('Sessioni create: %s, annullate: %s, eliminate: %s', v_created_count, v_cancelled_count, v_deleted_count)::text;
END;
$$;

-- WRAPPER legacy per retrocompatibilità
CREATE OR REPLACE FUNCTION smart_generate_sessions_with_weeks(
    _course_id uuid,
    _duration_weeks integer DEFAULT 12,
    _start_date date DEFAULT NULL,
    _new_schedules jsonb DEFAULT NULL
)
RETURNS TABLE (
    success boolean,
    sessions_created integer,
    sessions_cancelled integer,
    sessions_deleted integer,
    affected_bookings integer,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_participants integer;
BEGIN
    SELECT max_participants INTO v_max_participants FROM courses WHERE id = _course_id;
    
    IF _new_schedules IS NOT NULL THEN
        UPDATE course_schedules SET is_active = false WHERE course_id = _course_id;
        
        INSERT INTO course_schedules (
            course_id, day_of_week, start_time, end_time, 
            room_id, room_name, max_participants_override, 
            difficulty_level_override, is_active
        )
        SELECT 
            _course_id,
            (schedule->>'day_of_week')::integer,
            (schedule->>'start_time')::time,
            (schedule->>'end_time')::time,
            NULLIF(schedule->>'room_id', '')::uuid,
            schedule->>'room_name',
            (schedule->>'max_participants_override')::integer,
            (schedule->>'difficulty_level_override')::integer,
            true
        FROM jsonb_array_elements(_new_schedules) AS schedule;
    END IF;
    
    RETURN QUERY
    SELECT * FROM smart_generate_sessions_with_weeks(
        p_course_id := _course_id,
        p_schedules := NULL,
        p_duration_weeks := _duration_weeks,
        p_start_date := _start_date,
        p_max_participants := v_max_participants
    );
END;
$$;

-- RIPRISTINO CORSO
UPDATE course_sessions
SET status = 'scheduled',
    notes = COALESCE(notes || E'\n', '') || 'Ripristinata - fix 05/01/2026'
WHERE course_id = '964aa144-1fec-41ad-8d20-452577646b28'
  AND status = 'cancelled'
  AND session_date >= CURRENT_DATE;

SELECT * FROM smart_generate_sessions_with_weeks(
    p_course_id := '964aa144-1fec-41ad-8d20-452577646b28'::uuid,
    p_schedules := NULL,
    p_duration_weeks := 12,
    p_start_date := CURRENT_DATE,
    p_max_participants := NULL
);

UPDATE courses 
SET end_date = CURRENT_DATE + (duration_weeks * 7)
WHERE id = '964aa144-1fec-41ad-8d20-452577646b28';