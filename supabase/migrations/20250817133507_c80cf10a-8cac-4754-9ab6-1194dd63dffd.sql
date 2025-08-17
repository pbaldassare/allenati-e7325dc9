-- Inserisci categorie predefinite per la palestra "Palestradue"
INSERT INTO public.course_categories (gym_id, name, description, color_hex, icon_name, is_active)
VALUES 
  ('18f4ba46-c73c-4f0d-9951-303798bdbd8b', 'Fitness', 'Allenamento generale e tonificazione', '#10B981', 'Dumbbell', true),
  ('18f4ba46-c73c-4f0d-9951-303798bdbd8b', 'Yoga', 'Equilibrio e flessibilità', '#8B5CF6', 'Flower', true),
  ('18f4ba46-c73c-4f0d-9951-303798bdbd8b', 'Pilates', 'Rinforzo del core e postura', '#F59E0B', 'Activity', true),
  ('18f4ba46-c73c-4f0d-9951-303798bdbd8b', 'Cardio', 'Allenamento cardiovascolare', '#EF4444', 'Heart', true),
  ('18f4ba46-c73c-4f0d-9951-303798bdbd8b', 'Functional Training', 'Allenamento funzionale', '#3B82F6', 'Target', true),
  ('18f4ba46-c73c-4f0d-9951-303798bdbd8b', 'Danza', 'Corsi di danza e movimento', '#EC4899', 'Music', true);