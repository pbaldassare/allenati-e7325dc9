-- Ensure course_sessions table has proper constraints for session management
-- Add unique constraint to prevent duplicate sessions for same course/date/time
ALTER TABLE public.course_sessions 
ADD CONSTRAINT course_sessions_unique_session 
UNIQUE (course_id, session_date, start_time);

-- Create index for better performance on session lookups
CREATE INDEX IF NOT EXISTS idx_course_sessions_lookup 
ON public.course_sessions (course_id, session_date, start_time);

-- Create index for booking session lookups
CREATE INDEX IF NOT EXISTS idx_bookings_session_lookup 
ON public.bookings (course_id, scheduled_date, scheduled_time, status);