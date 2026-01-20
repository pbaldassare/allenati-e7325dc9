-- Ricollega le prenotazioni orfane alle sessioni corrispondenti per il corso Pilates Reformer
UPDATE bookings b
SET session_id = cs.id,
    updated_at = now()
FROM course_sessions cs
WHERE b.session_id IS NULL 
  AND b.course_id = '964aa144-1fec-41ad-8d20-452577646b28'
  AND b.status = 'confirmed'
  AND cs.course_id = b.course_id
  AND cs.session_date = b.scheduled_date
  AND cs.start_time = b.scheduled_time;

-- Aggiorna available_spots per le sessioni con prenotazioni ricollegati
UPDATE course_sessions cs
SET available_spots = cs.max_participants - (
    SELECT COUNT(*) 
    FROM bookings b 
    WHERE b.session_id = cs.id 
      AND b.status = 'confirmed'
),
updated_at = now()
WHERE cs.course_id = '964aa144-1fec-41ad-8d20-452577646b28'
  AND cs.session_date >= '2026-01-19';