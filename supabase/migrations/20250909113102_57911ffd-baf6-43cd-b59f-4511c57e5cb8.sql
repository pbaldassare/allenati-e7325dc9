-- Ensure all Combat Lab instructors have proper gym assignments
-- First, get Combat Lab gym ID
DO $$
DECLARE
  combat_lab_gym_id uuid;
  instructor_record RECORD;
BEGIN
  -- Get Combat Lab gym ID
  SELECT id INTO combat_lab_gym_id 
  FROM public.gyms 
  WHERE name = 'Combat Lab' 
  LIMIT 1;

  IF combat_lab_gym_id IS NOT NULL THEN
    -- For each instructor in Combat Lab that has gym_id set but no assignment
    FOR instructor_record IN 
      SELECT i.id as instructor_id, i.user_id, i.gym_id
      FROM public.instructors i
      LEFT JOIN public.instructor_gym_assignments iga ON i.id = iga.instructor_id AND iga.gym_id = combat_lab_gym_id
      WHERE i.gym_id = combat_lab_gym_id 
        AND i.is_active = true
        AND iga.instructor_id IS NULL
    LOOP
      -- Create instructor_gym_assignment record
      INSERT INTO public.instructor_gym_assignments (
        instructor_id, 
        gym_id, 
        has_owner_privileges, 
        is_active
      ) VALUES (
        instructor_record.instructor_id,
        combat_lab_gym_id,
        -- Check if this instructor is a gym owner
        EXISTS (
          SELECT 1 FROM public.user_gym_memberships ugm
          WHERE ugm.user_id = instructor_record.user_id 
            AND ugm.gym_id = combat_lab_gym_id
            AND ugm.membership_type = 'owner'
            AND ugm.status = 'active'
        ),
        true
      )
      ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
        is_active = true,
        has_owner_privileges = EXCLUDED.has_owner_privileges;
      
      RAISE NOTICE 'Created assignment for instructor % in gym %', instructor_record.instructor_id, combat_lab_gym_id;
    END LOOP;
  END IF;
END $$;