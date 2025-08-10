-- Create sample instructors using existing user IDs
WITH existing_users AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) as rn
  FROM public.profiles 
  LIMIT 3
)
INSERT INTO public.instructors (user_id, gym_id, bio, specializations, certifications, experience_years, hourly_rate, is_active) 
SELECT 
  user_id,
  null,
  CASE 
    WHEN rn = 1 THEN 'Istruttore esperto di fitness generale'
    WHEN rn = 2 THEN 'Specialista in allenamento funzionale'
    WHEN rn = 3 THEN 'Esperto di yoga e pilates'
  END,
  CASE 
    WHEN rn = 1 THEN ARRAY['Fitness', 'Cardio']
    WHEN rn = 2 THEN ARRAY['Functional Training', 'HIIT']
    WHEN rn = 3 THEN ARRAY['Yoga', 'Pilates']
  END,
  CASE 
    WHEN rn = 1 THEN ARRAY['Certificazione Fitness Base']
    WHEN rn = 2 THEN ARRAY['Certificazione Functional Training']
    WHEN rn = 3 THEN ARRAY['Certificazione Yoga RYT 200']
  END,
  CASE 
    WHEN rn = 1 THEN 3
    WHEN rn = 2 THEN 5
    WHEN rn = 3 THEN 4
  END,
  CASE 
    WHEN rn = 1 THEN 25.00
    WHEN rn = 2 THEN 30.00
    WHEN rn = 3 THEN 28.00
  END,
  true
FROM existing_users
ON CONFLICT (user_id) DO NOTHING;