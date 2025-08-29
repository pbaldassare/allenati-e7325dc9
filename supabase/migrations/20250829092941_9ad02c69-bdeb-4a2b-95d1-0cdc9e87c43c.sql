-- ELIMINAZIONE PRECISA DEI 3 CORSI DISATTIVATI RIMANENTI
-- Utilizzando gli ID specifici identificati per massima precisione

-- FASE 1: Verifica ed eliminazione delle prenotazioni esistenti
DELETE FROM public.bookings 
WHERE course_id IN (
  '4f69de26-3bc9-422f-bbd7-7f63d8e73a06',  -- Kick Boxing JUNIOR
  '98d48887-da9f-478f-b29e-6690d21dce66',  -- MMA
  '6aeaf0a7-5b73-4bd5-9628-5dc29c343170'   -- OPEN MAT
);

-- FASE 2: Eliminazione delle sessioni dei corsi
DELETE FROM public.course_sessions 
WHERE course_id IN (
  '4f69de26-3bc9-422f-bbd7-7f63d8e73a06',
  '98d48887-da9f-478f-b29e-6690d21dce66',
  '6aeaf0a7-5b73-4bd5-9628-5dc29c343170'
);

-- FASE 3: Eliminazione degli schedule
DELETE FROM public.course_schedules 
WHERE course_id IN (
  '4f69de26-3bc9-422f-bbd7-7f63d8e73a06',
  '98d48887-da9f-478f-b29e-6690d21dce66',
  '6aeaf0a7-5b73-4bd5-9628-5dc29c343170'
);

-- FASE 4: Eliminazione delle eccezioni di schedule
DELETE FROM public.course_schedule_exceptions 
WHERE course_id IN (
  '4f69de26-3bc9-422f-bbd7-7f63d8e73a06',
  '98d48887-da9f-478f-b29e-6690d21dce66',
  '6aeaf0a7-5b73-4bd5-9628-5dc29c343170'
);

-- FASE 5: Eliminazione delle chat e relativi dati
-- Prima eliminiamo i messaggi delle chat
DELETE FROM public.chat_messages 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE course_id IN (
    '4f69de26-3bc9-422f-bbd7-7f63d8e73a06',
    '98d48887-da9f-478f-b29e-6690d21dce66',
    '6aeaf0a7-5b73-4bd5-9628-5dc29c343170'
  )
);

-- Poi eliminiamo i partecipanti delle chat
DELETE FROM public.chat_participants 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE course_id IN (
    '4f69de26-3bc9-422f-bbd7-7f63d8e73a06',
    '98d48887-da9f-478f-b29e-6690d21dce66',
    '6aeaf0a7-5b73-4bd5-9628-5dc29c343170'
  )
);

-- Infine eliminiamo le chat room
DELETE FROM public.chat_rooms 
WHERE course_id IN (
  '4f69de26-3bc9-422f-bbd7-7f63d8e73a06',
  '98d48887-da9f-478f-b29e-6690d21dce66',
  '6aeaf0a7-5b73-4bd5-9628-5dc29c343170'
);

-- FASE 6: Eliminazione finale dei corsi usando gli ID specifici
DELETE FROM public.courses 
WHERE id IN (
  '4f69de26-3bc9-422f-bbd7-7f63d8e73a06',  -- Kick Boxing JUNIOR
  '98d48887-da9f-478f-b29e-6690d21dce66',  -- MMA  
  '6aeaf0a7-5b73-4bd5-9628-5dc29c343170'   -- OPEN MAT
);