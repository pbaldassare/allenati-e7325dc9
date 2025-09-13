-- Fix course sessions for "Preparazione Atletica" after schedule changes
-- Course ID: 91d90b92-083e-4c70-a46f-0490bd40bf4b

-- Step 1: Delete future sessions without confirmed bookings
DELETE FROM public.course_sessions 
WHERE course_id = '91d90b92-083e-4c70-a46f-0490bd40bf4b'
  AND session_date >= CURRENT_DATE
  AND id NOT IN (
    SELECT DISTINCT session_id 
    FROM public.bookings 
    WHERE session_id IS NOT NULL 
      AND status = 'confirmed'
  );

-- Step 2: Regenerate sessions for the next 3 months using the updated schedules
SELECT generate_course_sessions(
  '91d90b92-083e-4c70-a46f-0490bd40bf4b'::uuid,
  CURRENT_DATE,
  (CURRENT_DATE + INTERVAL '3 months')::date
);

-- Step 3: Verify the regenerated sessions have the correct schedule
-- This will show the new sessions created
SELECT 
  cs.session_date,
  cs.start_time,
  cs.end_time,
  cs.room_name,
  cs.created_at,
  cs.updated_at
FROM public.course_sessions cs
WHERE cs.course_id = '91d90b92-083e-4c70-a46f-0490bd40bf4b'
  AND cs.session_date >= CURRENT_DATE
ORDER BY cs.session_date, cs.start_time
LIMIT 20;