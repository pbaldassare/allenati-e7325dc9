-- Aggiorna il corso PREPARAZIONE ATLETICA con date valide e rigenera le sessioni
UPDATE courses 
SET start_date = CURRENT_DATE, 
    end_date = CURRENT_DATE + INTERVAL '12 weeks'
WHERE id = 'ae0ba06c-fc57-49d7-ad33-b71bf4dd81c9';

-- Rigenera le sessioni per il corso
SELECT generate_course_sessions_with_duration('ae0ba06c-fc57-49d7-ad33-b71bf4dd81c9'::uuid);