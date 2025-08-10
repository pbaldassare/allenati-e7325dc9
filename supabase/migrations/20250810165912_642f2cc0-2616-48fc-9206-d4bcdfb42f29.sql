-- Create sample users for instructors (since instructors table references user_id)
-- We'll use fake UUIDs for the demo
INSERT INTO public.profiles (user_id, first_name, last_name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Istruttore', '1'),
  ('22222222-2222-2222-2222-222222222222', 'Istruttore', '2'),
  ('33333333-3333-3333-3333-333333333333', 'Istruttore', '3')
ON CONFLICT (user_id) DO NOTHING;

-- Create sample instructors
INSERT INTO public.instructors (user_id, gym_id, bio, specializations, certifications, experience_years, hourly_rate, is_active) VALUES 
  ('11111111-1111-1111-1111-111111111111', null, 'Istruttore esperto di fitness generale', ARRAY['Fitness', 'Cardio'], ARRAY['Certificazione Fitness Base'], 3, 25.00, true),
  ('22222222-2222-2222-2222-222222222222', null, 'Specialista in allenamento funzionale', ARRAY['Functional Training', 'HIIT'], ARRAY['Certificazione Functional Training'], 5, 30.00, true),
  ('33333333-3333-3333-3333-333333333333', null, 'Esperto di yoga e pilates', ARRAY['Yoga', 'Pilates'], ARRAY['Certificazione Yoga RYT 200'], 4, 28.00, true)
ON CONFLICT (user_id) DO NOTHING;