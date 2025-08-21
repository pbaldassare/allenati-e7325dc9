-- Clean all course-related data to start fresh
DELETE FROM public.bookings;
DELETE FROM public.course_sessions;  
DELETE FROM public.course_schedules;
DELETE FROM public.courses;

-- Reset sequences if needed (optional, but good for clean start)
-- Note: We keep gyms, instructors, course_categories, gym_rooms intact