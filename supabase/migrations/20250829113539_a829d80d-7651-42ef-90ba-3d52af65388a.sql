-- Ripristina la sessione Muay Thai del 5 settembre 2025
UPDATE public.course_sessions 
SET status = 'scheduled'
WHERE id = '0534fa91-6dbe-4b16-ae57-e1336b44a98e' 
AND status = 'cancelled';

-- Verifica il risultato
SELECT 
  cs.id,
  cs.session_date,
  cs.start_time,
  cs.end_time,
  cs.status,
  cs.max_participants,
  cs.available_spots,
  cs.room_name,
  c.name as course_name,
  g.name as gym_name
FROM public.course_sessions cs
JOIN public.courses c ON cs.course_id = c.id
JOIN public.gyms g ON c.gym_id = g.id
WHERE cs.id = '0534fa91-6dbe-4b16-ae57-e1336b44a98e';