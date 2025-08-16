-- Delete all dependencies for gyms we want to remove
-- Gym IDs to remove:
-- Fight Club Milano: f47ac10b-58cc-4372-a567-0e02b2c3d479
-- Palestra Test: d2bd8dd6-f92b-498b-b8eb-2a13bff62ced
-- super lab: f1ce0961-741e-41c6-af7d-2e19df1d28ca

-- 1. Delete medical certificates for these gyms
DELETE FROM public.medical_certificates 
WHERE gym_id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced', 
  'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
);

-- 2. Delete chat messages for chat rooms of these gyms
DELETE FROM public.chat_messages 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE gym_id IN (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
    'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
  )
);

-- 3. Delete chat participants for chat rooms of these gyms
DELETE FROM public.chat_participants 
WHERE room_id IN (
  SELECT id FROM public.chat_rooms 
  WHERE gym_id IN (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
    'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
  )
);

-- 4. Delete chat rooms for these gyms
DELETE FROM public.chat_rooms 
WHERE gym_id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
  'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
);

-- 5. Delete courses and related data for these gyms
-- First delete course schedules
DELETE FROM public.course_schedules 
WHERE course_id IN (
  SELECT id FROM public.courses 
  WHERE gym_id IN (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
    'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
  )
);

-- Delete bookings for courses of these gyms
DELETE FROM public.bookings 
WHERE course_id IN (
  SELECT id FROM public.courses 
  WHERE gym_id IN (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
    'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
  )
);

-- Delete courses for these gyms
DELETE FROM public.courses 
WHERE gym_id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
  'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
);

-- 6. Delete course categories for these gyms
DELETE FROM public.course_categories 
WHERE gym_id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
  'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
);

-- 7. Delete instructors for these gyms
DELETE FROM public.instructors 
WHERE gym_id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
  'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
);

-- 8. Delete user gym memberships for these gyms
DELETE FROM public.user_gym_memberships 
WHERE gym_id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
  'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
);

-- 9. Delete gym rooms for these gyms
DELETE FROM public.gym_rooms 
WHERE gym_id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
  'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
);

-- 10. Delete gym applications for these gyms (by name)
DELETE FROM public.gym_applications 
WHERE gym_name IN ('Fight Club Milano', 'Palestra Test', 'super lab');

-- 11. Finally, delete the gyms themselves
DELETE FROM public.gyms 
WHERE id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'd2bd8dd6-f92b-498b-b8eb-2a13bff62ced',
  'f1ce0961-741e-41c6-af7d-2e19df1d28ca'
);