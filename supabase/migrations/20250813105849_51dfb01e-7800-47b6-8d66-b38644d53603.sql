-- Remove capacity column from gym_rooms table
ALTER TABLE public.gym_rooms DROP COLUMN IF EXISTS capacity;

-- Create function to add default rooms to existing gyms
CREATE OR REPLACE FUNCTION public.add_default_rooms_to_gym(_gym_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if gym already has rooms, if so, skip
  IF EXISTS (SELECT 1 FROM public.gym_rooms WHERE gym_id = _gym_id) THEN
    RETURN;
  END IF;

  -- Insert the 3 default rooms
  INSERT INTO public.gym_rooms (gym_id, name, description, color, is_active)
  VALUES 
    (_gym_id, 'Sala 1', 'Sala principale per corsi di gruppo', '#10B981', true),
    (_gym_id, 'Sala 2', 'Sala secondaria per attività specifiche', '#3B82F6', true),
    (_gym_id, 'Sala 3', 'Sala per allenamenti personalizzati', '#EF4444', true);
END;
$$;

-- Add default rooms to existing gyms (Palestra Test and demo)
DO $$
DECLARE
  gym_record RECORD;
BEGIN
  -- Find gyms named "Palestra Test" or "demo" and add default rooms
  FOR gym_record IN 
    SELECT id, name FROM public.gyms 
    WHERE name IN ('Palestra Test', 'demo') 
      AND is_active = true
  LOOP
    PERFORM public.add_default_rooms_to_gym(gym_record.id);
  END LOOP;
END $$;