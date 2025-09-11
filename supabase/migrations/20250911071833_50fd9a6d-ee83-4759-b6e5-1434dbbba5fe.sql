-- Configura kato.aifp come Super Istruttore per Combat Lab

-- 1. Aggiungi ruolo instructor a kato.aifp
INSERT INTO public.user_roles (user_id, role, is_active)
VALUES ('f6898ef6-f152-430d-b9c6-218b7b6bd2c5', 'instructor', true)
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

-- 2. Crea membership a Combat Lab per kato.aifp
INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
VALUES ('f6898ef6-f152-430d-b9c6-218b7b6bd2c5', '8abc8f4d-4260-4850-a0d0-b1ada1265701', 'member', 'active')
ON CONFLICT (user_id, gym_id) DO UPDATE SET 
  membership_type = 'member',
  status = 'active',
  updated_at = now();

-- 3. Crea record istruttore per kato.aifp con privilegi owner
INSERT INTO public.instructors (
  user_id, 
  gym_id, 
  bio, 
  is_active, 
  has_owner_privileges,
  first_name,
  last_name
) VALUES (
  'f6898ef6-f152-430d-b9c6-218b7b6bd2c5',
  '8abc8f4d-4260-4850-a0d0-b1ada1265701',
  'Super Istruttore di Combat Lab',
  true,
  true,
  'Paolo',
  'Kato'
) ON CONFLICT (user_id) DO UPDATE SET
  gym_id = EXCLUDED.gym_id,
  is_active = true,
  has_owner_privileges = true,
  first_name = COALESCE(EXCLUDED.first_name, instructors.first_name),
  last_name = COALESCE(EXCLUDED.last_name, instructors.last_name),
  bio = COALESCE(EXCLUDED.bio, instructors.bio);

-- 4. Crea instructor_gym_assignment con privilegi owner
-- Prima ottieni l'instructor_id
DO $$
DECLARE
  _instructor_id uuid;
BEGIN
  -- Ottieni l'instructor_id per kato.aifp
  SELECT id INTO _instructor_id 
  FROM public.instructors 
  WHERE user_id = 'f6898ef6-f152-430d-b9c6-218b7b6bd2c5';
  
  -- Crea l'assignment con privilegi owner
  INSERT INTO public.instructor_gym_assignments (
    instructor_id, 
    gym_id, 
    has_owner_privileges, 
    is_active
  ) VALUES (
    _instructor_id,
    '8abc8f4d-4260-4850-a0d0-b1ada1265701',
    true,
    true
  ) ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
    has_owner_privileges = true,
    is_active = true,
    updated_at = now();
END $$;