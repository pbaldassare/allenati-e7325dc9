
-- 1. Add room_id_snapshot to bookings for immutable history
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_id_snapshot uuid;

-- 2. Backfill course_schedules.room_name from gym_rooms (fixes root cause)
UPDATE public.course_schedules sch
   SET room_name = r.name
  FROM public.gym_rooms r
 WHERE sch.room_id = r.id
   AND (sch.room_name IS NULL OR sch.room_name = '' OR sch.room_name = 'Sala non specificata');

-- 3. Backfill course_sessions.room_id and room_name from active schedules
UPDATE public.course_sessions cs
   SET room_id   = sch.room_id,
       room_name = COALESCE(r.name, sch.room_name)
  FROM public.course_schedules sch
  LEFT JOIN public.gym_rooms r ON r.id = sch.room_id
 WHERE cs.course_id = sch.course_id
   AND EXTRACT(DOW FROM cs.session_date)::int = sch.day_of_week
   AND cs.start_time = sch.start_time
   AND sch.is_active = true
   AND sch.room_id IS NOT NULL
   AND (cs.room_id IS NULL OR cs.room_name IS NULL OR cs.room_name = '' OR cs.room_name = 'Sala non specificata');

-- 4. Backfill bookings (only future confirmed) using fixed session data
UPDATE public.bookings b
   SET room_id_snapshot = cs.room_id,
       room_name_snapshot = cs.room_name
  FROM public.course_sessions cs
 WHERE b.session_id = cs.id
   AND b.status = 'confirmed'
   AND b.scheduled_date >= CURRENT_DATE
   AND cs.room_id IS NOT NULL
   AND (b.room_name_snapshot IS NULL OR b.room_name_snapshot = '' OR b.room_name_snapshot = 'Sala non specificata');

-- 5. Trigger: snapshot room data on insert (immutable history)
CREATE OR REPLACE FUNCTION public.bookings_snapshot_room()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    SELECT 
      COALESCE(NEW.room_id_snapshot, cs.room_id),
      COALESCE(NULLIF(NEW.room_name_snapshot, ''), cs.room_name, 'Sala non specificata')
    INTO NEW.room_id_snapshot, NEW.room_name_snapshot
    FROM public.course_sessions cs
    WHERE cs.id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_snapshot_room ON public.bookings;
CREATE TRIGGER trg_bookings_snapshot_room
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.bookings_snapshot_room();

-- 6. Fix RPC: when inserting sessions, derive room_name from gym_rooms if missing
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
    v_max_participants integer;
    v_existing_session record;
    v_active_schedule_keys text[];
    v_schedule_key text;
    v_has_bookings boolean;
    v_resolved_room_name text;
BEGIN
    SELECT * INTO v_course FROM courses WHERE id = p_course_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, 0, 0, 'Corso non trovato'::text;
        RETURN;
    END IF;
    
    v_max_participants := COALESCE(p_max_participants, v_course.max_participants, 10);
    
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
            COALESCE(
              NULLIF(s->>'room_name', ''),
              (SELECT name FROM gym_rooms WHERE id = NULLIF(s->>'room_id', '')::uuid)
            ),
            (s->>'max_participants_override')::integer,
            (s->>'difficulty_level_override')::integer,
            true
        FROM jsonb_array_elements(p_schedules) AS s;
    END IF;
    
    v_start_date := COALESCE(p_start_date, CURRENT_DATE);
    v_end_date := v_start_date + (p_duration_weeks * 7);
    
    SELECT array_agg(
        cs.day_of_week::text || '_' || to_char(cs.start_time, 'HH24:MI')
    ) INTO v_active_schedule_keys
    FROM course_schedules cs
    WHERE cs.course_id = p_course_id AND cs.is_active = true;
    
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
            v_has_bookings := EXISTS (
                SELECT 1 FROM bookings b 
                WHERE b.session_id = v_existing_session.id 
                  AND b.status IN ('confirmed', 'waitlist')
            );
            
            IF NOT v_has_bookings THEN
                DELETE FROM course_sessions WHERE id = v_existing_session.id;
                v_deleted_count := v_deleted_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    FOR v_schedule IN 
        SELECT cs.*, COALESCE(gr.name, cs.room_name) as resolved_room_name
        FROM course_schedules cs
        LEFT JOIN gym_rooms gr ON gr.id = cs.room_id
        WHERE cs.course_id = p_course_id AND cs.is_active = true
    LOOP
        v_session_date := v_start_date;
        v_resolved_room_name := v_schedule.resolved_room_name;
        
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
                    v_resolved_room_name,
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
