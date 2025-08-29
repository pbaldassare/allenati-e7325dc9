-- ELIMINAZIONE COMPLETA DEI 3 CORSI SPECIFICATI
-- FASE 1: Cancellazione delle Sessioni
DELETE FROM public.course_sessions 
WHERE course_id IN (
  '6aeaf0a7-5b73-44c1-b9b7-c4c824b3d48a', -- OPEN MAT
  '7d5bcdef-0066-4538-ba1d-ad9097bd1798', -- Jiu jitsu No Gi  
  '1833673a-5540-44c1-b9b7-c4c824b3d48a'  -- Jiu jitsu
);

-- FASE 2: Cancellazione degli Schedule
DELETE FROM public.course_schedules 
WHERE course_id IN (
  '6aeaf0a7-5b73-44c1-b9b7-c4c824b3d48a', -- OPEN MAT
  '7d5bcdef-0066-4538-ba1d-ad9097bd1798', -- Jiu jitsu No Gi
  '1833673a-5540-44c1-b9b7-c4c824b3d48a'  -- Jiu jitsu
);

-- FASE 3: Cancellazione delle Schedule Exceptions (se esistenti)
DELETE FROM public.course_schedule_exceptions 
WHERE course_id IN (
  '6aeaf0a7-5b73-44c1-b9b7-c4c824b3d48a', -- OPEN MAT
  '7d5bcdef-0066-4538-ba1d-ad9097bd1798', -- Jiu jitsu No Gi
  '1833673a-5540-44c1-b9b7-c4c824b3d48a'  -- Jiu jitsu
);

-- FASE 4: Cancellazione delle Chat Room e relativi dati (se esistenti)
-- Prima cancelliamo i messaggi delle chat
DELETE FROM public.chat_messages 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE course_id IN (
    '6aeaf0a7-5b73-44c1-b9b7-c4c824b3d48a', -- OPEN MAT
    '7d5bcdef-0066-4538-ba1d-ad9097bd1798', -- Jiu jitsu No Gi
    '1833673a-5540-44c1-b9b7-c4c824b3d48a'  -- Jiu jitsu
  )
);

-- Poi cancelliamo i partecipanti delle chat
DELETE FROM public.chat_participants 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE course_id IN (
    '6aeaf0a7-5b73-44c1-b9b7-c4c824b3d48a', -- OPEN MAT
    '7d5bcdef-0066-4538-ba1d-ad9097bd1798', -- Jiu jitsu No Gi
    '1833673a-5540-44c1-b9b7-c4c824b3d48a'  -- Jiu jitsu
  )
);

-- Infine cancelliamo le chat room
DELETE FROM public.chat_rooms 
WHERE course_id IN (
  '6aeaf0a7-5b73-44c1-b9b7-c4c824b3d48a', -- OPEN MAT
  '7d5bcdef-0066-4538-ba1d-ad9097bd1798', -- Jiu jitsu No Gi
  '1833673a-5540-44c1-b9b7-c4c824b3d48a'  -- Jiu jitsu
);

-- FASE 5: Cancellazione dei Corsi (finale)
DELETE FROM public.courses 
WHERE id IN (
  '6aeaf0a7-5b73-44c1-b9b7-c4c824b3d48a', -- OPEN MAT
  '7d5bcdef-0066-4538-ba1d-ad9097bd1798', -- Jiu jitsu No Gi
  '1833673a-5540-44c1-b9b7-c4c824b3d48a'  -- Jiu jitsu
);