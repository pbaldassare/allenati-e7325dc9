-- Pulizia completa del database per reset corsi e prenotazioni

-- 1. Salvare i crediti originali prima della pulizia
CREATE TEMP TABLE temp_user_credits AS
SELECT 
  user_id,
  COALESCE(SUM(CASE WHEN transaction_type != 'booking' THEN amount ELSE 0 END), 0) as original_credits
FROM public.credits_transactions
GROUP BY user_id;

-- 2. Eliminare la cronologia delle prenotazioni
DELETE FROM public.booking_history 
WHERE booking_id IN (SELECT id FROM public.bookings);

-- 3. Eliminare tutte le prenotazioni
DELETE FROM public.bookings;

-- 4. Eliminare le sessioni dei corsi
DELETE FROM public.course_sessions;

-- 5. Eliminare le eccezioni ai programmi dei corsi
DELETE FROM public.course_schedule_exceptions;

-- 6. Eliminare i programmi dei corsi
DELETE FROM public.course_schedules;

-- 7. Eliminare le chat dei corsi (se esistono)
DELETE FROM public.chat_participants 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE room_type = 'course'
);

DELETE FROM public.chat_messages 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE room_type = 'course'
);

DELETE FROM public.chat_rooms 
WHERE room_type = 'course';

-- 8. Eliminare tutti i corsi
DELETE FROM public.courses;

-- 9. Eliminare le transazioni di crediti di tipo booking
DELETE FROM public.credits_transactions 
WHERE transaction_type = 'booking';

-- 10. Ripristinare i saldi dei crediti degli utenti
UPDATE public.profiles 
SET current_credits = COALESCE(temp_user_credits.original_credits, 0)
FROM temp_user_credits
WHERE profiles.user_id = temp_user_credits.user_id;

-- 11. Aggiornare il saldo per gli utenti che non avevano transazioni
UPDATE public.profiles 
SET current_credits = 0
WHERE user_id NOT IN (SELECT user_id FROM temp_user_credits);

-- 12. Eliminare la tabella temporanea
DROP TABLE temp_user_credits;