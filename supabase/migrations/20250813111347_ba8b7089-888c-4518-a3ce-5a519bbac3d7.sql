-- Create default categories for existing gyms (avoiding duplicates by checking name per gym)
INSERT INTO public.course_categories (gym_id, name, description, color_hex, icon_name, is_active)
SELECT 
  g.id as gym_id,
  category_data.name,
  category_data.description,
  category_data.color_hex,
  category_data.icon_name,
  true as is_active
FROM public.gyms g
CROSS JOIN (
  VALUES 
    ('Yoga', 'Corsi di yoga per tutti i livelli', '#10B981', 'Zap'),
    ('Functional Training', 'Allenamento funzionale e movimento naturale', '#3B82F6', 'Dumbbell'),
    ('Cardio', 'Allenamenti cardiovascolari ad alta intensità', '#F59E0B', 'Heart'),
    ('Strength Training', 'Allenamento di forza e resistenza', '#EF4444', 'Trophy'),
    ('Pilates', 'Metodo Pilates per core e postura', '#7C3AED', 'Flower'),
    ('CrossFit', 'Allenamento funzionale ad alta intensità', '#06B6D4', 'Zap')
) AS category_data(name, description, color_hex, icon_name)
WHERE g.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.course_categories cc 
    WHERE cc.gym_id = g.id AND cc.name = category_data.name
  );

-- Update the add_default_rooms_to_gym function to also create default categories
CREATE OR REPLACE FUNCTION public.add_default_rooms_to_gym(_gym_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check if gym already has rooms, if so, skip rooms creation
  IF NOT EXISTS (SELECT 1 FROM public.gym_rooms WHERE gym_id = _gym_id) THEN
    -- Insert the 3 default rooms
    INSERT INTO public.gym_rooms (gym_id, name, description, color, is_active)
    VALUES 
      (_gym_id, 'Sala 1', 'Sala principale per corsi di gruppo', '#10B981', true),
      (_gym_id, 'Sala 2', 'Sala secondaria per attività specifiche', '#3B82F6', true),
      (_gym_id, 'Sala 3', 'Sala per allenamenti personalizzati', '#EF4444', true);
  END IF;

  -- Check if gym already has categories, if so, skip categories creation
  IF NOT EXISTS (SELECT 1 FROM public.course_categories WHERE gym_id = _gym_id) THEN
    -- Insert the 6 default categories
    INSERT INTO public.course_categories (gym_id, name, description, color_hex, icon_name, is_active)
    VALUES 
      (_gym_id, 'Yoga', 'Corsi di yoga per tutti i livelli', '#10B981', 'Zap', true),
      (_gym_id, 'Functional Training', 'Allenamento funzionale e movimento naturale', '#3B82F6', 'Dumbbell', true),
      (_gym_id, 'Cardio', 'Allenamenti cardiovascolari ad alta intensità', '#F59E0B', 'Heart', true),
      (_gym_id, 'Strength Training', 'Allenamento di forza e resistenza', '#EF4444', 'Trophy', true),
      (_gym_id, 'Pilates', 'Metodo Pilates per core e postura', '#7C3AED', 'Flower', true),
      (_gym_id, 'CrossFit', 'Allenamento funzionale ad alta intensità', '#06B6D4', 'Zap', true);
  END IF;
END;
$function$;