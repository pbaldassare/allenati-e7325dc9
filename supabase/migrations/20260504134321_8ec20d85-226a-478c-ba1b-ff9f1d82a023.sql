
CREATE OR REPLACE FUNCTION public.smart_generate_sessions_with_weeks(p_course_id uuid, p_schedules jsonb DEFAULT NULL::jsonb, p_duration_weeks integer DEFAULT 12, p_start_date date DEFAULT NULL::date, p_max_participants integer DEFAULT NULL::integer)
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
    v_max_participants integer;
    v_existing_session record;
    v_active_schedule_keys text[];
    v_schedule_key text;
    v_has_bookings boolean;
BEGIN
    RAISE NOTICE '[SAFE-P] Starting smart session generation for course %', p_course_id;
    
    SELECT * INTO v_course FROM courses WHERE id = p_course_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, 0, 0, 'Corso non trovato'::text;
        RETURN;
    END IF;
    
    v_max_participants := COALESCE(p_max_participants, v_course.max_participants, 10);
    
    -- Step 1: Update course_schedules if provided
    IF p_schedules IS NOT NULL THEN
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
    
    -- Step 2: Build active schedule keys (day_of_week + start_time)
    SELECT array_agg(
        cs.day_of_week::text || '_' || to_char(cs.start_time, 'HH24:MI')
    ) INTO v_active_schedule_keys
    FROM course_schedules cs
    WHERE cs.course_id = p_course_id AND cs.is_active = true;
    
    RAISE NOTICE '[SAFE-P] Active schedule keys: %', v_active_schedule_keys;
    
    -- Step 3: Handle existing sessions that NO LONGER match active schedules
    -- IMPORTANT: Sessions with bookings (confirmed/waitlist) are PRESERVED untouched
    -- so participants remain visible. Only sessions WITHOUT bookings are cleaned up.
    FOR v_existing_session IN 
        SELECT cs.id, cs.session_date, cs.start_time,
               EXTRACT(DOW FROM cs.session_date)::text || '_' || to_char(cs.start_time, 'HH24:MI') as schedule_key
        FROM course_sessions cs
        WHERE cs.course_id = p_course_id 
          AND cs.session_date >= v_start_date
          AND cs.status = 'scheduled'
    LOOP
        v_schedule_key := v_existing_session.schedule_key;
        
        -- If this session doesn't match any active schedule, decide what to do
        IF v_active_schedule_keys IS NULL OR NOT (v_schedule_key = ANY(v_active_schedule_keys)) THEN
            -- Check if session has bookings
            v_has_bookings := EXISTS (
                SELECT 1 FROM bookings b 
                WHERE b.session_id = v_existing_session.id 
                  AND b.status IN ('confirmed', 'waitlist')
            );
            
            IF v_has_bookings THEN
                -- PRESERVE session as-is. Do NOT cancel session, do NOT touch bookings.
                -- Participants remain visible at the original day/time/room.
                -- Owner can manually cancel the session from the calendar drawer if needed.
                RAISE NOTICE '[SAFE-P] Preserved orphan session % (has bookings) at %', v_existing_session.id, v_existing_session.session_date;
            ELSE
                -- No bookings, safe to delete
                DELETE FROM course_sessions WHERE id = v_existing_session.id;
                v_deleted_count := v_deleted_count + 1;
                RAISE NOTICE '[SAFE-P] Deleted session % (no bookings)', v_existing_session.id;
            END IF;
        END IF;
    END LOOP;
    
    -- Step 4: Generate new sessions for each active schedule
    -- ON CONFLICT only updates sessions that have NO confirmed/waitlist bookings,
    -- to avoid changing room/capacity on a session whose participants are already locked in.
    FOR v_schedule IN 
        SELECT * FROM course_schedules 
        WHERE course_id = p_course_id AND is_active = true
    LOOP
        v_session_date := v_start_date;
        
        WHILE v_session_date <= v_end_date LOOP
            IF EXTRACT(DOW FROM v_session_date) = v_schedule.day_of_week THEN
                INSERT INTO course_sessions (
                    course_id, session_date, start_time, end_time,
                    room_id, room_name, max_participants, available_spots,
                    difficulty_level, status
                )
                VALUES (
                    p_course_id,
                    v_session_date,
                    v_schedule.start_time,
                    v_schedule.end_time,
                    v_schedule.room_id,
                    v_schedule.room_name,
                    COALESCE(v_schedule.max_participants_override, v_max_participants),
                    COALESCE(v_schedule.max_participants_override, v_max_participants),
                    v_schedule.difficulty_level_override,
                    'scheduled'
                )
                ON CONFLICT (course_id, session_date, start_time) DO UPDATE SET
                    end_time = EXCLUDED.end_time,
                    room_id = EXCLUDED.room_id,
                    room_name = EXCLUDED.room_name,
                    max_participants = EXCLUDED.max_participants,
                    difficulty_level = EXCLUDED.difficulty_level,
                    updated_at = now()
                WHERE course_sessions.status = 'scheduled'
                  AND NOT EXISTS (
                    SELECT 1 FROM bookings b
                    WHERE b.session_id = course_sessions.id
                      AND b.status IN ('confirmed', 'waitlist')
                  );
                
                IF FOUND THEN
                    v_created_count := v_created_count + 1;
                END IF;
            END IF;
            
            v_session_date := v_session_date + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '[SAFE-P] Complete: created=%, cancelled=%, deleted=%, bookings=%', 
        v_created_count, v_cancelled_count, v_deleted_count, v_booking_count;
    
    RETURN QUERY SELECT 
        true,
        v_created_count,
        v_cancelled_count,
        v_deleted_count,
        v_booking_count,
        format('Generazione completata: %s sessioni create/aggiornate, %s preservate con prenotazioni, %s eliminate',
            v_created_count, v_cancelled_count, v_deleted_count)::text;
END;
$function$;
