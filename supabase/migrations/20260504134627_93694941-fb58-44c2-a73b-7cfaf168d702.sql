
-- Rilink delle bookings orfane (session_id NULL) alla sessione corrispondente
-- per stesso course_id + scheduled_date + scheduled_time.
-- Solo bookings confirmed/waitlist su date future.
UPDATE bookings b
SET session_id = match.session_id,
    updated_at = now()
FROM (
  SELECT b2.id AS booking_id,
         cs.id AS session_id
  FROM bookings b2
  JOIN course_sessions cs
    ON cs.course_id = b2.course_id
   AND cs.session_date = b2.scheduled_date
   AND cs.start_time = b2.scheduled_time
   AND cs.status IN ('scheduled','hidden')
  WHERE b2.session_id IS NULL
    AND b2.status IN ('confirmed','waitlist')
    AND b2.scheduled_date >= CURRENT_DATE
) AS match
WHERE b.id = match.booking_id;
