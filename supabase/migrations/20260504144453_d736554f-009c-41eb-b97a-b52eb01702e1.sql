UPDATE course_sessions cs
SET available_spots = cs.max_participants - COALESCE(b.cnt, 0),
    updated_at = now()
FROM (
  SELECT session_id, COUNT(*) AS cnt
  FROM bookings
  WHERE status = 'confirmed' AND session_id IS NOT NULL
  GROUP BY session_id
) b
WHERE b.session_id = cs.id
  AND cs.session_date >= CURRENT_DATE
  AND cs.available_spots <> (cs.max_participants - b.cnt);