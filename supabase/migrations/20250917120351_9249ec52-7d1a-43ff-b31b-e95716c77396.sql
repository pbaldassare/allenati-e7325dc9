-- Aggiorna i corsi esistenti con date di default (1 settembre 2025 - 15 giugno 2026)
UPDATE public.courses 
SET 
  start_date = '2025-09-01'::date,
  end_date = '2026-06-15'::date,
  updated_at = now()
WHERE start_date IS NULL OR end_date IS NULL;

-- Aggiungi una colonna end_date se non esiste già (dovrebbe già esistere)
-- ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS end_date date;

-- Verifica che i corsi abbiano date valide
UPDATE public.courses 
SET end_date = start_date + (duration_weeks * INTERVAL '7 days')
WHERE end_date IS NULL AND start_date IS NOT NULL AND duration_weeks IS NOT NULL;