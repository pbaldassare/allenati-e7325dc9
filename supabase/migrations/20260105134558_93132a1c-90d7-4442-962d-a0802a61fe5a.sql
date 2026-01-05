-- Aggiungere colonna instructor_id_override alla tabella course_sessions
ALTER TABLE course_sessions 
ADD COLUMN instructor_id_override UUID REFERENCES instructors(id) DEFAULT NULL;

-- Commento per documentazione
COMMENT ON COLUMN course_sessions.instructor_id_override IS 
  'Override istruttore per questa sessione. Se NULL usa instructor_id del corso.';