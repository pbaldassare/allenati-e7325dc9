-- Fix: Correggi l'end_time per tutte le sessioni del Venerdì del corso Pugilato
UPDATE course_sessions
SET end_time = '17:30:00'
WHERE course_id = '52c8da8f-fcd4-4b9e-862d-6b910e1d261a'
AND EXTRACT(DOW FROM session_date) = 5
AND end_time = '10:00:00';