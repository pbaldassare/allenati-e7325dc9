-- Function to link new users to gym applications when they register with matching email
CREATE OR REPLACE FUNCTION public.link_user_to_gym_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  gym_record RECORD;
BEGIN
  -- Check if there's an approved gym application with this email that doesn't have an owner yet
  SELECT g.id as gym_id, ga.id as application_id
  INTO gym_record
  FROM public.gyms g
  JOIN public.gym_applications ga ON ga.gym_name = g.name AND ga.applicant_email = NEW.email
  WHERE ga.status = 'approved' 
    AND ga.applicant_user_id IS NULL
    AND g.owner_email = NEW.email
  LIMIT 1;
  
  IF gym_record.gym_id IS NOT NULL THEN
    -- Update the gym application with the new user ID
    UPDATE public.gym_applications 
    SET applicant_user_id = NEW.id
    WHERE id = gym_record.application_id;
    
    -- Assign gym_owner role to the user
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'gym_owner')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create gym membership for the owner
    INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
    VALUES (NEW.id, gym_record.gym_id, 'owner', 'active')
    ON CONFLICT (user_id, gym_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically link users to gym applications on registration
DROP TRIGGER IF EXISTS on_auth_user_created_link_gym ON auth.users;
CREATE TRIGGER on_auth_user_created_link_gym
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_user_to_gym_application();