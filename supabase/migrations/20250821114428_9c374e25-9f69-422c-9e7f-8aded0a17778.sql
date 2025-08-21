-- Clean up existing course data to prepare for new session-specific system
-- Delete in correct order to respect foreign key constraints

-- 1. Delete bookings for the course "primo corso"
DELETE FROM public.bookings 
WHERE course_id IN (
  SELECT id FROM public.courses WHERE name = 'primo corso'
);

-- 2. Delete course sessions for the course
DELETE FROM public.course_sessions 
WHERE course_id IN (
  SELECT id FROM public.courses WHERE name = 'primo corso'
);

-- 3. Delete course schedules for the course
DELETE FROM public.course_schedules 
WHERE course_id IN (
  SELECT id FROM public.courses WHERE name = 'primo corso'
);

-- 4. Delete the course itself
DELETE FROM public.courses WHERE name = 'primo corso';

-- Verify instructor "kevn bacon" is properly set up for demo gym
-- This query will show the instructor details
SELECT 
  i.id as instructor_id,
  i.user_id,
  p.first_name,
  p.last_name,
  p.email,
  i.gym_id,
  g.name as gym_name,
  i.is_active
FROM public.instructors i
JOIN public.profiles p ON i.user_id = p.user_id  
JOIN public.gyms g ON i.gym_id = g.id
WHERE p.email = 'demopalestra@gmail.com'
  AND i.is_active = true;