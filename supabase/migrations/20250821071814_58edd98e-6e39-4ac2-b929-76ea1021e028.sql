-- Complete system reset: delete all courses, sessions, and bookings with credit refunds

-- Step 1: Refund credits for all existing bookings
INSERT INTO public.credits_transactions (user_id, amount, balance_after, transaction_type, description, reference_id, gym_id)
SELECT 
  b.user_id,
  b.credits_used, -- Positive amount for refund
  COALESCE(p.current_credits, 0) + b.credits_used, -- New balance after refund
  'refund',
  'Rimborso per reset sistema - ' || c.name,
  b.id,
  c.gym_id
FROM public.bookings b
JOIN public.courses c ON b.course_id = c.id
JOIN public.profiles p ON b.user_id = p.user_id
WHERE b.status = 'confirmed';

-- Step 2: Update user credit balances
UPDATE public.profiles 
SET current_credits = (
  SELECT COALESCE(SUM(amount), 0)
  FROM public.credits_transactions 
  WHERE user_id = profiles.user_id
);

-- Step 3: Delete booking history (depends on bookings)
DELETE FROM public.booking_history 
WHERE booking_id IN (SELECT id FROM public.bookings);

-- Step 4: Delete all bookings
DELETE FROM public.bookings;

-- Step 5: Delete all course sessions
DELETE FROM public.course_sessions;

-- Step 6: Delete all course schedules
DELETE FROM public.course_schedules;

-- Step 7: Delete all courses
DELETE FROM public.courses;