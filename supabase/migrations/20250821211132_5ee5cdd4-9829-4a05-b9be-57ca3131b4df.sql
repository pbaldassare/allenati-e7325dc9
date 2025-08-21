-- Eliminazione completa di tutti i corsi, prenotazioni e sessioni
-- ATTENZIONE: Operazione irreversibile

-- 1. Elimina tutte le prenotazioni
DELETE FROM public.bookings;

-- 2. Elimina tutte le sessioni dei corsi
DELETE FROM public.course_sessions;

-- 3. Elimina tutti i programmi dei corsi
DELETE FROM public.course_schedules;

-- 4. Elimina tutte le eccezioni ai programmi (se presenti)
DELETE FROM public.course_schedule_exceptions;

-- 5. Elimina tutti i corsi
DELETE FROM public.courses;