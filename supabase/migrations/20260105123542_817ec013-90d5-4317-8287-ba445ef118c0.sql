-- ============================================
-- FASE 1: Ripristinare le sessioni cancellate erroneamente
-- ============================================

UPDATE course_sessions
SET status = 'scheduled',
    notes = COALESCE(notes || E'\n', '') || 'Ripristinata automaticamente - cancellazione erronea corretta ' || now()::text,
    updated_at = now()
WHERE course_id = '964aa144-1fec-41ad-8d20-452577646b28'
  AND status = 'cancelled'
  AND session_date >= '2026-01-05';

-- ============================================
-- FASE 2: Correggere la funzione smart_generate_sessions_with_weeks
-- Il bug era nel confronto delle chiavi che includeva i secondi nel time
-- ============================================

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
  
  -- First, build array of active schedule keys (day_of_week + start_time ONLY - no room_id, no seconds)
  -- FIX: Normalizzare il formato del tempo usando to_char per evitare mismatch con i secondi
  FOR v_schedule IN SELECT * FROM jsonb_array_elements(p_schedules)
  LOOP
    v_day_of_week := (v_schedule->>'day_of_week')::integer;
    v_start_time := (v_schedule->>'start_time')::time;
    
    -- FIX: Usare solo giorno + orario (HH:MI) senza room_id e senza secondi
    v_schedule_key := v_day_of_week::text || '_' || to_char(v_start_time, 'HH24:MI');
    v_active_schedule_keys := array_append(v_active_schedule_keys, v_schedule_key);
  END LOOP;
  
  -- Process existing future sessions: cancel those with bookings, delete those without
  FOR v_existing_session IN 
    SELECT cs.id, cs.session_date, cs.start_time, cs.room_id,
           EXTRACT(DOW FROM cs.session_date)::integer as dow,
           EXISTS (
             SELECT 1 FROM bookings b 
             WHERE b.session_id = cs.id 
             AND b.status IN ('confirmed', 'completed')
           ) as has_confirmed_bookings
    FROM course_sessions cs
    WHERE cs.course_id = p_course_id
      AND cs.session_date >= CURRENT_DATE
      AND cs.status NOT IN ('cancelled', 'hidden')
  LOOP
    -- Build key for this existing session - FIX: stesso formato normalizzato
    v_schedule_key := v_existing_session.dow::text || '_' || 
                      to_char(v_existing_session.start_time, 'HH24:MI');
    
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
        AND status IN ('confirmed', 'completed');
        
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
        -- Session already exists, update it if needed (but keep bookings)
        UPDATE course_sessions
        SET end_time = v_end_time,
            room_id = v_room_id,
            room_name = v_room_name,
            max_participants = v_max_parts,
            difficulty_level = v_difficulty,
            -- Ripristina lo status a scheduled se era cancelled (solo se corrisponde a schedule attivo)
            status = CASE WHEN status = 'cancelled' THEN 'scheduled' ELSE status END,
            updated_at = now()
        WHERE course_id = p_course_id
          AND session_date = v_session_date
          AND start_time = v_start_time;
      END;
      
      -- Move to next week
      v_session_date := v_session_date + 7;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'sessions_created', v_sessions_created,
    'sessions_deleted', v_sessions_deleted,
    'sessions_cancelled', v_sessions_cancelled,
    'affected_bookings', v_affected_bookings,
    'end_date', v_end_date::text,
    'message', format('Generazione completata: %s create, %s eliminate, %s annullate', 
                      v_sessions_created, v_sessions_deleted, v_sessions_cancelled)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- FASE 3: Aggiornare end_date del corso basato su duration_weeks
-- ============================================

UPDATE courses
SET end_date = CURRENT_DATE + (duration_weeks * 7),
    updated_at = now()
WHERE id = '964aa144-1fec-41ad-8d20-452577646b28';

-- ============================================
-- FASE 4: Generare tutte le sessioni mancanti per il corso
-- Recupera gli schedule attivi e chiama la funzione corretta
-- ============================================

DO $$
DECLARE
  v_schedules jsonb;
  v_result jsonb;
  v_duration_weeks integer;
  v_max_participants integer;
BEGIN
  -- Get course info
  SELECT duration_weeks, max_participants 
  INTO v_duration_weeks, v_max_participants
  FROM courses 
  WHERE id = '964aa144-1fec-41ad-8d20-452577646b28';
  
  -- Get active schedules for this course
  SELECT jsonb_agg(
    jsonb_build_object(
      'day_of_week', day_of_week,
      'start_time', start_time::text,
      'end_time', end_time::text,
      'room_id', room_id,
      'room_name', room_name,
      'max_participants_override', max_participants_override,
      'difficulty_level_override', difficulty_level_override
    )
  )
  INTO v_schedules
  FROM course_schedules
  WHERE course_id = '964aa144-1fec-41ad-8d20-452577646b28'
    AND is_active = true;
  
  -- Call the fixed function to generate all missing sessions
  SELECT smart_generate_sessions_with_weeks(
    '964aa144-1fec-41ad-8d20-452577646b28'::uuid,
    v_schedules,
    v_duration_weeks,
    CURRENT_DATE,
    v_max_participants
  ) INTO v_result;
  
  RAISE NOTICE 'Risultato rigenerazione: %', v_result;
END $$;