-- Link all existing users to the demo gym
INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
SELECT 
  p.user_id,
  g.id as gym_id,
  'member' as membership_type,
  'active' as status
FROM public.profiles p
CROSS JOIN (SELECT id FROM public.gyms WHERE name = 'demo' LIMIT 1) g
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.user_gym_memberships ugm 
  WHERE ugm.user_id = p.user_id AND ugm.gym_id = g.id
);

-- Update the handle_new_user trigger to automatically link users to selected gym
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  selected_gym_id uuid;
BEGIN
  -- Create profile automatically
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'Nome'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'Cognome')
  );
  
  -- Assign basic_user role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'basic_user');
  
  -- Create default app preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  -- Check if gym_id was provided in metadata and create membership
  selected_gym_id := (NEW.raw_user_meta_data ->> 'selected_gym_id')::uuid;
  
  IF selected_gym_id IS NOT NULL THEN
    INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
    VALUES (NEW.id, selected_gym_id, 'member', 'active');
  END IF;
  
  RETURN NEW;
END;
$function$;