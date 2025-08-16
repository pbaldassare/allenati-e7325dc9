-- PULIZIA COMPLETA DATABASE CORSI
-- Elimina tutti i dati correlati ai corsi nell'ordine corretto per evitare errori di foreign key

-- Step 1: Cancella tutte le prenotazioni ai corsi
DELETE FROM bookings WHERE course_id IS NOT NULL;

-- Step 2: Cancella tutti i messaggi delle chat dei corsi
DELETE FROM chat_messages WHERE room_id IN (
  SELECT id FROM chat_rooms WHERE course_id IS NOT NULL
);

-- Step 3: Cancella tutti i partecipanti delle chat dei corsi
DELETE FROM chat_participants WHERE room_id IN (
  SELECT id FROM chat_rooms WHERE course_id IS NOT NULL
);

-- Step 4: Cancella tutte le chat rooms dei corsi
DELETE FROM chat_rooms WHERE course_id IS NOT NULL;

-- Step 5: Cancella tutte le schedule dei corsi
DELETE FROM course_schedules;

-- Step 6: Cancella tutti i corsi
DELETE FROM courses;

-- Verifica finale: conta i record rimanenti per confermare la pulizia
SELECT 
  'bookings' as table_name, COUNT(*) as remaining_records 
FROM bookings WHERE course_id IS NOT NULL
UNION ALL
SELECT 
  'course_schedules' as table_name, COUNT(*) as remaining_records 
FROM course_schedules
UNION ALL
SELECT 
  'chat_rooms_course' as table_name, COUNT(*) as remaining_records 
FROM chat_rooms WHERE course_id IS NOT NULL
UNION ALL
SELECT 
  'courses' as table_name, COUNT(*) as remaining_records 
FROM courses;