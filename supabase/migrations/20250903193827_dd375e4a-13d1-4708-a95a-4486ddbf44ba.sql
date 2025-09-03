-- Add fiscal fields to gyms table for Italian receipts
ALTER TABLE public.gyms 
ADD COLUMN business_name TEXT,
ADD COLUMN partita_iva TEXT,
ADD COLUMN codice_fiscale TEXT;