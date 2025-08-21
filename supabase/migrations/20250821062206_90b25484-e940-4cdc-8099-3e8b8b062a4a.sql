-- Update existing bookings to have session_id by matching course_id, scheduled_date and scheduled_time
UPDATE public.bookings 
SET session_id = cs.id
FROM public.course_sessions cs
WHERE bookings.session_id IS NULL 
  AND bookings.course_id = cs.course_id
  AND bookings.scheduled_date = cs.session_date
  AND bookings.scheduled_time = cs.start_time;