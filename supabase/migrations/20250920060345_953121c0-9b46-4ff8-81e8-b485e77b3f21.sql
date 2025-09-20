-- Create the analytics views for consolidated booking data
CREATE OR REPLACE VIEW public.booking_analytics AS
SELECT 
  b.id,
  b.user_id,
  b.course_id,
  b.scheduled_date,
  b.scheduled_time,
  b.status,
  b.credits_used,
  b.created_at,
  b.cancelled_at,
  b.cancellation_reason,
  -- Use consolidated data if available, fallback to live data
  COALESCE(b.course_name_snapshot, c.name) as course_name,
  COALESCE(b.instructor_name_snapshot, CONCAT(i.first_name, ' ', i.last_name)) as instructor_name,
  COALESCE(b.gym_name_snapshot, g.name) as gym_name,
  COALESCE(b.room_name_snapshot, cs.room_name, gr.name) as room_name,
  b.is_consolidated,
  -- User data (always live)
  p.first_name as user_first_name,
  p.last_name as user_last_name,
  p.email as user_email,
  p.phone as user_phone,
  -- Additional analytics fields
  EXTRACT(YEAR FROM b.scheduled_date) as booking_year,
  EXTRACT(MONTH FROM b.scheduled_date) as booking_month,
  EXTRACT(WEEK FROM b.scheduled_date) as booking_week,
  EXTRACT(DOW FROM b.scheduled_date) as booking_day_of_week
FROM public.bookings b
LEFT JOIN public.courses c ON b.course_id = c.id
LEFT JOIN public.instructors i ON c.instructor_id = i.id
LEFT JOIN public.gyms g ON c.gym_id = g.id
LEFT JOIN public.course_sessions cs ON b.session_id = cs.id
LEFT JOIN public.gym_rooms gr ON cs.room_id = gr.id
LEFT JOIN public.profiles p ON b.user_id = p.user_id;

-- Create view for booking analytics with user aggregations
CREATE OR REPLACE VIEW public.user_booking_analytics AS
SELECT 
  ba.user_id,
  ba.user_first_name,
  ba.user_last_name,
  ba.user_email,
  ba.gym_name,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE ba.status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE ba.status = 'completed') as completed_bookings,
  COUNT(*) FILTER (WHERE ba.status = 'cancelled') as cancelled_bookings,
  COUNT(*) FILTER (WHERE ba.status = 'no_show') as no_show_bookings,
  SUM(ba.credits_used) as total_credits_used,
  MIN(ba.created_at) as first_booking_date,
  MAX(ba.created_at) as last_booking_date,
  COUNT(DISTINCT ba.course_id) as unique_courses_booked,
  AVG(ba.credits_used) as avg_credits_per_booking
FROM public.booking_analytics ba
GROUP BY 
  ba.user_id, 
  ba.user_first_name, 
  ba.user_last_name, 
  ba.user_email,
  ba.gym_name;

-- Add RLS policies for the new views
CREATE POLICY "Gym owners can view their booking analytics" ON public.booking_analytics
FOR SELECT USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_name IN (
    SELECT g.name 
    FROM public.gyms g 
    WHERE g.id = ANY(get_user_owned_gyms(auth.uid()))
  )
);

CREATE POLICY "Admins can view all booking analytics" ON public.booking_analytics
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gym owners can view their user analytics" ON public.user_booking_analytics
FOR SELECT USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_name IN (
    SELECT g.name 
    FROM public.gyms g 
    WHERE g.id = ANY(get_user_owned_gyms(auth.uid()))
  )
);

CREATE POLICY "Admins can view all user analytics" ON public.user_booking_analytics
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));