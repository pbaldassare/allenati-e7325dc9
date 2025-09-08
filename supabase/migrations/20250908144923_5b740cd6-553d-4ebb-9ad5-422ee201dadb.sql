-- Fix Margherita Antonelli's role - remove instructor privileges
-- Step 1: Find and deactivate instructor role for user with email ntn.mgh@hotmail.com
UPDATE public.user_roles 
SET is_active = false, updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ntn.mgh@hotmail.com'
) AND role = 'instructor';

-- Step 2: Deactivate instructor record for this user
UPDATE public.instructors 
SET is_active = false, updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ntn.mgh@hotmail.com'
);

-- Step 3: Ensure basic_user role is active (in case it was accidentally deactivated)
UPDATE public.user_roles 
SET is_active = true, updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ntn.mgh@hotmail.com'
) AND role = 'basic_user';

-- Step 4: Verify gym membership is active
UPDATE public.user_gym_memberships 
SET status = 'active', updated_at = now()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ntn.mgh@hotmail.com'
) AND membership_type = 'member';