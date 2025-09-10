-- Fix inconsistency for super instructor ntn.mgh@hotmail.com
-- Update has_owner_privileges in instructors table to match instructor_gym_assignments

UPDATE public.instructors 
SET has_owner_privileges = true
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'ntn.mgh@hotmail.com'
) AND has_owner_privileges = false;

-- Also update membership_type to owner for consistency
UPDATE public.user_gym_memberships 
SET membership_type = 'owner'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'ntn.mgh@hotmail.com'
) AND membership_type = 'member';