-- Funzione per aggiornare le sessioni quando un orario viene MODIFICATO (non rimosso/aggiunto)
-- Questa funzione aggiorna le sessioni FUTURE che corrispondono al vecchio orario
-- con i nuovi valori, preservando le sessioni passate e quelle con prenotazioni

CREATE OR REPLACE FUNCTION public.update_schedule_sessions(
    p_course_id uuid,
    p_old_day_of_week integer,
    p_old_start_time time,
    p_new_day_of_week integer,
    p_new_start_time time,
    p_new_end_time time,
    p_new_room_id uuid DEFAULT NULL,
    p_new_room_name text DEFAULT NULL,
    p_new_max_participants integer DEFAULT NULL,
    p_new_difficulty_level integer DEFAULT NULL,
    p_from_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    updated_count integer, 
    preserved_count integer, 
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_updated integer := 0;
    v_preserved integer := 0;
    v_session record;
    v_new_session_date date;
    v_day_diff integer;
BEGIN
    RAISE NOTICE '[UPDATE_SCHEDULE] Updating sessions: course=%, old=%/%, new=%/%', 
        p_course_id, p_old_day_of_week, p_old_start_time, p_new_day_of_week, p_new_start_time;

    -- Calcola la differenza di giorni se il giorno della settimana è cambiato
    v_day_diff := p_new_day_of_week - p_old_day_of_week;
    
    -- Trova tutte le sessioni future che corrispondono al vecchio orario
    FOR v_session IN 
        SELECT cs.id, cs.session_date, cs.start_time, cs.status,
               (SELECT COUNT(*) FROM bookings b WHERE b.session_id = cs.id AND b.status IN ('confirmed', 'waitlist')) as booking_count
        FROM course_sessions cs
        WHERE cs.course_id = p_course_id
          AND cs.session_date >= p_from_date
          AND EXTRACT(DOW FROM cs.session_date) = p_old_day_of_week
          AND cs.start_time = p_old_start_time
          AND cs.status = 'scheduled'
        ORDER BY cs.session_date
    LOOP
        -- Se la sessione ha prenotazioni, la preserviamo e NON la modifichiamo
        IF v_session.booking_count > 0 THEN
            v_preserved := v_preserved + 1;
            RAISE NOTICE '[UPDATE_SCHEDULE] Preserved session % (% bookings)', v_session.id, v_session.booking_count;
        ELSE
            -- Calcola la nuova data della sessione se il giorno è cambiato
            v_new_session_date := v_session.session_date + v_day_diff;
            
            -- Verifica che non esista già una sessione nella nuova data/ora
            IF NOT EXISTS (
                SELECT 1 FROM course_sessions 
                WHERE course_id = p_course_id 
                  AND session_date = v_new_session_date 
                  AND start_time = p_new_start_time
                  AND id != v_session.id
            ) THEN
                -- Aggiorna la sessione con i nuovi valori
                UPDATE course_sessions
                SET 
                    session_date = v_new_session_date,
                    start_time = p_new_start_time,
                    end_time = p_new_end_time,
                    room_id = COALESCE(p_new_room_id, room_id),
                    room_name = COALESCE(p_new_room_name, room_name),
                    max_participants = COALESCE(p_new_max_participants, max_participants),
                    available_spots = COALESCE(p_new_max_participants, max_participants),
                    difficulty_level = p_new_difficulty_level,
                    updated_at = now()
                WHERE id = v_session.id;
                
                v_updated := v_updated + 1;
                RAISE NOTICE '[UPDATE_SCHEDULE] Updated session % to %/%', v_session.id, v_new_session_date, p_new_start_time;
            ELSE
                -- Conflitto: esiste già una sessione, preserva questa
                v_preserved := v_preserved + 1;
                RAISE NOTICE '[UPDATE_SCHEDULE] Conflict, preserved session %', v_session.id;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        v_updated,
        v_preserved,
        format('Aggiornate %s sessioni, preservate %s (con prenotazioni o conflitti)', v_updated, v_preserved)::text;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_schedule_sessions TO authenticated;

COMMENT ON FUNCTION public.update_schedule_sessions IS 
'Aggiorna le sessioni future quando un orario viene modificato. 
Preserva le sessioni con prenotazioni e quelle in conflitto.';