-- Remove duplicate foreign key constraint
ALTER TABLE public.courses 
DROP CONSTRAINT fk_courses_instructor;