-- Add missing foreign key constraint between courses and instructors
ALTER TABLE public.courses 
ADD CONSTRAINT fk_courses_instructor 
FOREIGN KEY (instructor_id) REFERENCES public.instructors(id);