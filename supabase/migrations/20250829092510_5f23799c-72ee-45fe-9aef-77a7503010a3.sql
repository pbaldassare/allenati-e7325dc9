-- ELIMINAZIONE COMPLETA DEI 4 CORSI DISATTIVI SPECIFICATI
-- FASE 1: Cancellazione delle Sessioni
DELETE FROM public.course_sessions 
WHERE course_id IN (
  SELECT id FROM public.courses 
  WHERE is_active = false 
  AND (
    (name = 'MMA' AND description LIKE '%SPORT DA COMBATTIMENTO%')
    OR (name = 'Kick Boxing' AND description LIKE '%JUNIOR%')
    OR (name LIKE '%OPEN MAT%' AND description LIKE '%Grappling%')
  )
);

-- FASE 2: Cancellazione degli Schedule
DELETE FROM public.course_schedules 
WHERE course_id IN (
  SELECT id FROM public.courses 
  WHERE is_active = false 
  AND (
    (name = 'MMA' AND description LIKE '%SPORT DA COMBATTIMENTO%')
    OR (name = 'Kick Boxing' AND description LIKE '%JUNIOR%')
    OR (name LIKE '%OPEN MAT%' AND description LIKE '%Grappling%')
  )
);

-- FASE 3: Cancellazione delle Schedule Exceptions (se esistenti)
DELETE FROM public.course_schedule_exceptions 
WHERE course_id IN (
  SELECT id FROM public.courses 
  WHERE is_active = false 
  AND (
    (name = 'MMA' AND description LIKE '%SPORT DA COMBATTIMENTO%')
    OR (name = 'Kick Boxing' AND description LIKE '%JUNIOR%')
    OR (name LIKE '%OPEN MAT%' AND description LIKE '%Grappling%')
  )
);

-- FASE 4: Cancellazione delle Chat Room e relativi dati (se esistenti)
-- Prima cancelliamo i messaggi delle chat
DELETE FROM public.chat_messages 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE course_id IN (
    SELECT id FROM public.courses 
    WHERE is_active = false 
    AND (
      (name = 'MMA' AND description LIKE '%SPORT DA COMBATTIMENTO%')
      OR (name = 'Kick Boxing' AND description LIKE '%JUNIOR%')
      OR (name LIKE '%OPEN MAT%' AND description LIKE '%Grappling%')
    )
  )
);

-- Poi cancelliamo i partecipanti delle chat
DELETE FROM public.chat_participants 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE course_id IN (
    SELECT id FROM public.courses 
    WHERE is_active = false 
    AND (
      (name = 'MMA' AND description LIKE '%SPORT DA COMBATTIMENTO%')
      OR (name = 'Kick Boxing' AND description LIKE '%JUNIOR%')
      OR (name LIKE '%OPEN MAT%' AND description LIKE '%Grappling%')
    )
  )
);

-- Infine cancelliamo le chat room
DELETE FROM public.chat_rooms 
WHERE course_id IN (
  SELECT id FROM public.courses 
  WHERE is_active = false 
  AND (
    (name = 'MMA' AND description LIKE '%SPORT DA COMBATTIMENTO%')
    OR (name = 'Kick Boxing' AND description LIKE '%JUNIOR%')
    OR (name LIKE '%OPEN MAT%' AND description LIKE '%Grappling%')
  )
);

-- FASE 5: Cancellazione dei Corsi (finale)
DELETE FROM public.courses 
WHERE is_active = false 
AND (
  (name = 'MMA' AND description LIKE '%SPORT DA COMBATTIMENTO%')
  OR (name = 'Kick Boxing' AND description LIKE '%JUNIOR%')
  OR (name LIKE '%OPEN MAT%' AND description LIKE '%Grappling%')
);