-- Drop the unique constraint on name to allow same category names for different gyms
ALTER TABLE public.course_categories DROP CONSTRAINT IF EXISTS course_categories_name_key;

-- Add a unique constraint on (gym_id, name) instead
ALTER TABLE public.course_categories ADD CONSTRAINT course_categories_gym_name_unique UNIQUE (gym_id, name);

-- Now create missing categories for gyms that don't have them
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