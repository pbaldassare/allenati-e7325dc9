-- Update gym owner profiles with realistic names and ensure they are instructors

-- Step 1: Update existing gym owner profiles with realistic names
UPDATE public.profiles 
SET 
  first_name = CASE 
    WHEN user_id IN (
      SELECT ugm.user_id 
      FROM user_gym_memberships ugm 
      JOIN gyms g ON ugm.gym_id = g.id 
      WHERE g.name = 'demo' AND ugm.membership_type = 'owner'
    ) THEN 'Mario'
    WHEN user_id IN (
      SELECT ugm.user_id 
      FROM user_gym_memberships ugm 
      JOIN gyms g ON ugm.gym_id = g.id 
      WHERE g.name = 'Palestradue' AND ugm.membership_type = 'owner'
    ) THEN 'Giuseppe'
    ELSE COALESCE(first_name, 'Proprietario')
  END,
  last_name = CASE 
    WHEN user_id IN (
      SELECT ugm.user_id 
      FROM user_gym_memberships ugm 
      JOIN gyms g ON ugm.gym_id = g.id 
      WHERE g.name = 'demo' AND ugm.membership_type = 'owner'
    ) THEN 'Rossi'
    WHEN user_id IN (
      SELECT ugm.user_id 
      FROM user_gym_memberships ugm 
      JOIN gyms g ON ugm.gym_id = g.id 
      WHERE g.name = 'Palestradue' AND ugm.membership_type = 'owner'
    ) THEN 'Bianchi'
    ELSE COALESCE(last_name, 'Palestra')
  END
WHERE user_id IN (
  SELECT ugm.user_id 
  FROM user_gym_memberships ugm 
  WHERE ugm.membership_type = 'owner' AND ugm.status = 'active'
);

-- Step 2: Ensure all gym owners are also instructors
INSERT INTO public.instructors (user_id, gym_id, bio, is_active)
SELECT DISTINCT 
  ugm.user_id,
  ugm.gym_id,
  'Proprietario e istruttore principale della palestra',
  true
FROM public.user_gym_memberships ugm
WHERE ugm.membership_type = 'owner' 
  AND ugm.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.instructors i 
    WHERE i.user_id = ugm.user_id AND i.gym_id = ugm.gym_id
  );

-- Step 3: Ensure existing gym owner instructors are active
UPDATE public.instructors 
SET is_active = true, 
    bio = COALESCE(bio, 'Proprietario e istruttore principale della palestra')
WHERE user_id IN (
  SELECT ugm.user_id 
  FROM public.user_gym_memberships ugm 
  WHERE ugm.membership_type = 'owner' AND ugm.status = 'active'
);

-- Step 4: Create function to get gym owner as default instructor
CREATE OR REPLACE FUNCTION public.get_gym_owner_instructor(_gym_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT i.id
  FROM public.instructors i
  JOIN public.user_gym_memberships ugm ON i.user_id = ugm.user_id 
  WHERE ugm.gym_id = _gym_id 
    AND ugm.membership_type = 'owner' 
    AND ugm.status = 'active'
    AND i.gym_id = _gym_id
    AND i.is_active = true
  LIMIT 1
$$;