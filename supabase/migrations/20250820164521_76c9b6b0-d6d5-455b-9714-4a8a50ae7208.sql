-- Procedura per cancellazione completa corsi e rimborso crediti

-- 1. Prima creiamo le transazioni di rimborso per le prenotazioni attive
DO $$
DECLARE
    booking_record RECORD;
    user_current_credits INTEGER;
BEGIN
    -- Per ogni prenotazione confermata, creiamo una transazione di rimborso
    FOR booking_record IN 
        SELECT DISTINCT b.user_id, b.credits_used, c.name as course_name, b.id as booking_id
        FROM bookings b
        JOIN courses c ON b.course_id = c.id
        WHERE b.status = 'confirmed'
    LOOP
        -- Ottieni i crediti attuali dell'utente
        SELECT COALESCE(current_credits, 0) INTO user_current_credits
        FROM profiles 
        WHERE user_id = booking_record.user_id;
        
        -- Crea transazione di rimborso
        INSERT INTO credits_transactions (
            user_id,
            amount,
            balance_after,
            transaction_type,
            description,
            reference_id
        ) VALUES (
            booking_record.user_id,
            booking_record.credits_used, -- Rimborso positivo
            user_current_credits + booking_record.credits_used,
            'refund',
            'Rimborso per cancellazione corso: ' || booking_record.course_name,
            booking_record.booking_id
        );
        
        -- Aggiorna i crediti nel profilo utente
        UPDATE profiles 
        SET current_credits = user_current_credits + booking_record.credits_used
        WHERE user_id = booking_record.user_id;
    END LOOP;
END $$;

-- 2. Cancellazione dati nell'ordine corretto (rispettando foreign keys)

-- Cancella tutte le prenotazioni
DELETE FROM bookings;

-- Cancella tutte le sessioni dei corsi
DELETE FROM course_sessions;

-- Cancella tutte le eccezioni di programma
DELETE FROM course_schedule_exceptions;

-- Cancella tutti gli orari dei corsi
DELETE FROM course_schedules;

-- Cancella eventuali chat room legate ai corsi
DELETE FROM chat_participants WHERE room_id IN (
    SELECT id FROM chat_rooms WHERE room_type = 'course'
);
DELETE FROM chat_messages WHERE room_id IN (
    SELECT id FROM chat_rooms WHERE room_type = 'course'
);
DELETE FROM chat_rooms WHERE room_type = 'course';

-- Cancella tutti i corsi
DELETE FROM courses;