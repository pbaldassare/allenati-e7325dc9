-- Create courses for demo gym (gym_id: first gym)
-- Get gym IDs and related data first, then create courses

-- Create courses for demo gym
WITH demo_gym AS (
  SELECT id as gym_id FROM gyms WHERE name = 'demo' LIMIT 1
),
demo_categories AS (
  SELECT id, name FROM course_categories WHERE gym_id = (SELECT gym_id FROM demo_gym)
),
demo_instructors AS (
  SELECT id FROM instructors WHERE gym_id = (SELECT gym_id FROM demo_gym) AND is_active = true
),
demo_rooms AS (
  SELECT id, name FROM gym_rooms WHERE gym_id = (SELECT gym_id FROM demo_gym) AND is_active = true
)

INSERT INTO courses (
  name, description, category_id, instructor_id, gym_id, max_participants, 
  duration_minutes, credits_required, difficulty_level, deadline_hours
)
SELECT 
  course_data.name,
  course_data.description,
  COALESCE((SELECT id FROM demo_categories WHERE name = course_data.category_name LIMIT 1), 
           (SELECT id FROM demo_categories LIMIT 1)),
  (SELECT id FROM demo_instructors LIMIT 1),
  (SELECT gym_id FROM demo_gym),
  course_data.max_participants,
  course_data.duration_minutes,
  course_data.credits_required,
  course_data.difficulty_level,
  course_data.deadline_hours
FROM (
  VALUES 
    ('Functional Training Mattina', 'Allenamento funzionale per iniziare la giornata', 'Functional Training', 20, 60, 1, 3, 24),
    ('CrossFit Intensivo', 'Allenamento CrossFit ad alta intensità', 'CrossFit', 15, 45, 2, 4, 12),
    ('Pilates Dolce', 'Pilates per principianti e intermedi', 'Pilates', 25, 50, 1, 2, 24),
    ('Cardio Power', 'Allenamento cardio ad alta intensità', 'Cardio', 18, 40, 1, 3, 6),
    ('Strength Training', 'Allenamento di forza e resistenza', 'Strength Training', 12, 75, 2, 4, 24),
    ('Yoga Flow Sera', 'Yoga rilassante per terminare la giornata', 'Yoga', 22, 60, 1, 1, 24),
    ('HIIT Explosive', 'High Intensity Interval Training', 'Functional Training', 16, 30, 1, 4, 6),
    ('Pilates Avanzato', 'Pilates per praticanti esperti', 'Pilates', 15, 55, 2, 4, 12),
    ('Cardio Dance', 'Cardio attraverso la danza', 'Cardio', 25, 45, 1, 2, 24),
    ('Olympic Lifting', 'Sollevamento pesi olimpico', 'Strength Training', 10, 90, 3, 5, 24)
) AS course_data(name, description, category_name, max_participants, duration_minutes, credits_required, difficulty_level, deadline_hours);

-- Create courses for Palestradue
WITH palestradue_gym AS (
  SELECT id as gym_id FROM gyms WHERE name = 'Palestradue' LIMIT 1
),
palestradue_categories AS (
  SELECT id, name FROM course_categories WHERE gym_id = (SELECT gym_id FROM palestradue_gym)
),
palestradue_instructors AS (
  SELECT id FROM instructors WHERE gym_id = (SELECT gym_id FROM palestradue_gym) AND is_active = true
),
palestradue_rooms AS (
  SELECT id, name FROM gym_rooms WHERE gym_id = (SELECT gym_id FROM palestradue_gym) AND is_active = true
)

INSERT INTO courses (
  name, description, category_id, instructor_id, gym_id, max_participants, 
  duration_minutes, credits_required, difficulty_level, deadline_hours
)
SELECT 
  course_data.name,
  course_data.description,
  COALESCE((SELECT id FROM palestradue_categories WHERE name = course_data.category_name LIMIT 1), 
           (SELECT id FROM palestradue_categories LIMIT 1)),
  (SELECT id FROM palestradue_instructors LIMIT 1),
  (SELECT gym_id FROM palestradue_gym),
  course_data.max_participants,
  course_data.duration_minutes,
  course_data.credits_required,
  course_data.difficulty_level,
  course_data.deadline_hours
FROM (
  VALUES 
    ('Fitness Mattutino', 'Allenamento fitness per iniziare bene', 'Fitness', 25, 50, 1, 2, 24),
    ('Hatha Yoga', 'Yoga tradizionale per mente e corpo', 'Yoga', 20, 75, 1, 2, 24),
    ('Pilates Dinamico', 'Pilates con focus su dinamicità', 'Pilates', 18, 45, 1, 3, 12),
    ('Cardio Blast', 'Esplosione di energia cardio', 'Cardio', 22, 35, 1, 3, 6),
    ('Functional Power', 'Allenamento funzionale avanzato', 'Functional Training', 15, 60, 2, 4, 24),
    ('Danza Moderna', 'Espressione attraverso la danza', 'Danza', 30, 60, 1, 1, 24),
    ('Total Body', 'Allenamento completo del corpo', 'Fitness', 20, 55, 1, 3, 24),
    ('Vinyasa Yoga', 'Yoga dinamico e fluido', 'Yoga', 16, 70, 2, 3, 12),
    ('Zumba Fitness', 'Fitness divertente con la danza', 'Cardio', 28, 45, 1, 2, 24),
    ('Calisthenics', 'Allenamento a corpo libero', 'Functional Training', 12, 60, 2, 4, 24)
) AS course_data(name, description, category_name, max_participants, duration_minutes, credits_required, difficulty_level, deadline_hours);

-- Create course schedules for demo gym courses (August-September 2024)
WITH demo_courses AS (
  SELECT c.id, c.name, ROW_NUMBER() OVER (ORDER BY c.created_at) as rn
  FROM courses c 
  JOIN gyms g ON c.gym_id = g.id 
  WHERE g.name = 'demo'
),
demo_rooms AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as rn FROM gym_rooms WHERE gym_id = (SELECT id FROM gyms WHERE name = 'demo' LIMIT 1)
)

INSERT INTO course_schedules (course_id, day_of_week, start_time, end_time, room_id)
SELECT 
  dc.id,
  CASE 
    WHEN dc.rn <= 3 THEN 1  -- Monday
    WHEN dc.rn <= 6 THEN 3  -- Wednesday  
    WHEN dc.rn <= 8 THEN 5  -- Friday
    ELSE 2                  -- Tuesday
  END as day_of_week,
  CASE 
    WHEN dc.rn % 3 = 1 THEN '07:00'::time
    WHEN dc.rn % 3 = 2 THEN '12:00'::time
    ELSE '19:00'::time
  END as start_time,
  CASE 
    WHEN dc.rn % 3 = 1 THEN '08:00'::time
    WHEN dc.rn % 3 = 2 THEN '13:00'::time
    ELSE '20:30'::time
  END as end_time,
  dr.id
FROM demo_courses dc
JOIN demo_rooms dr ON ((dc.rn - 1) % 3) + 1 = dr.rn;

-- Create course schedules for Palestradue courses
WITH palestradue_courses AS (
  SELECT c.id, c.name, ROW_NUMBER() OVER (ORDER BY c.created_at) as rn
  FROM courses c 
  JOIN gyms g ON c.gym_id = g.id 
  WHERE g.name = 'Palestradue'
),
palestradue_rooms AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as rn FROM gym_rooms WHERE gym_id = (SELECT id FROM gyms WHERE name = 'Palestradue' LIMIT 1)
)

INSERT INTO course_schedules (course_id, day_of_week, start_time, end_time, room_id)
SELECT 
  pc.id,
  CASE 
    WHEN pc.rn <= 3 THEN 2  -- Tuesday
    WHEN pc.rn <= 6 THEN 4  -- Thursday
    WHEN pc.rn <= 8 THEN 6  -- Saturday
    ELSE 1                  -- Monday
  END as day_of_week,
  CASE 
    WHEN pc.rn % 4 = 1 THEN '08:30'::time
    WHEN pc.rn % 4 = 2 THEN '14:00'::time
    WHEN pc.rn % 4 = 3 THEN '18:30'::time
    ELSE '20:00'::time
  END as start_time,
  CASE 
    WHEN pc.rn % 4 = 1 THEN '09:30'::time
    WHEN pc.rn % 4 = 2 THEN '15:00'::time
    WHEN pc.rn % 4 = 3 THEN '19:30'::time
    ELSE '21:15'::time
  END as end_time,
  pr.id
FROM palestradue_courses pc
JOIN palestradue_rooms pr ON ((pc.rn - 1) % 3) + 1 = pr.rn;