-- Elimina tutti gli schedule duplicati, mantenendo solo il primo per ogni combinazione
DELETE FROM course_schedules
WHERE id IN (
  SELECT unnest(schedule_ids[2:]) as id_to_delete
  FROM (
    SELECT array_agg(id ORDER BY created_at) as schedule_ids
    FROM course_schedules
    GROUP BY course_id, day_of_week, start_time, room_id
    HAVING COUNT(*) > 1
  ) duplicates
);

-- Ora aggiungi il constraint unico
ALTER TABLE course_schedules
ADD CONSTRAINT unique_course_schedule_day_time 
UNIQUE (course_id, day_of_week, start_time, room_id);

-- Rigenera le sessioni per il corso Pugilato
SELECT generate_course_sessions_with_duration('52c8da8f-fcd4-4b9e-862d-6b910e1d261a');