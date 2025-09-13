-- Aggiorna il corso PREPARAZIONE ATLETICA con date valide e rigenera le sessioni
UPDATE courses 
SET start_date = CURRENT_DATE, 
    end_date = CURRENT_DATE + INTERVAL '12 weeks'
WHERE id = '91d90b92-083e-4c70-a46f-0490bd40bf4b';

-- Rigenera le sessioni per il corso
SELECT generate_course_sessions_with_duration('91d90b92-083e-4c70-a46f-0490bd40bf4b'::uuid);