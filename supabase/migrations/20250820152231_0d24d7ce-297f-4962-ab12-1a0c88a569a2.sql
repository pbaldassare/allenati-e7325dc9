-- Rimuovere corsi duplicati mantenendo solo il più recente
WITH duplicate_courses AS (
  SELECT id, name, created_at,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at DESC) as rn
  FROM public.courses
  WHERE name LIKE '%karaike%' OR name LIKE '%Corso karaike%'
)
DELETE FROM public.courses 
WHERE id IN (
  SELECT id FROM duplicate_courses WHERE rn > 1
);

-- Eliminare anche i relativi schedules dei corsi duplicati
DELETE FROM public.course_schedules 
WHERE course_id NOT IN (SELECT id FROM public.courses);