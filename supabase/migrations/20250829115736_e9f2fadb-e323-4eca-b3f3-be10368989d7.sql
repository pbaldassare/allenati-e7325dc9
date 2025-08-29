-- FASE 1: Aggiornare gli utenti esistenti con dati random
-- Funzione per generare codici fiscali realistici
CREATE OR REPLACE FUNCTION generate_realistic_fiscal_code()
RETURNS text AS $$
DECLARE
  letters char(1)[] := ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  numbers char(1)[] := ARRAY['0','1','2','3','4','5','6','7','8','9'];
  fiscal_code text := '';
BEGIN
  -- Primi 6 caratteri (cognome e nome): LETTERE
  FOR i IN 1..6 LOOP
    fiscal_code := fiscal_code || letters[1 + floor(random() * 26)::int];
  END LOOP;
  
  -- Seguono 2 numeri (anno di nascita)
  fiscal_code := fiscal_code || numbers[1 + floor(random() * 10)::int];
  fiscal_code := fiscal_code || numbers[1 + floor(random() * 10)::int];
  
  -- 1 lettera (mese)
  fiscal_code := fiscal_code || letters[1 + floor(random() * 26)::int];
  
  -- 2 numeri (giorno)
  fiscal_code := fiscal_code || numbers[1 + floor(random() * 10)::int];
  fiscal_code := fiscal_code || numbers[1 + floor(random() * 10)::int];
  
  -- 4 caratteri finali (comune e controllo)
  fiscal_code := fiscal_code || letters[1 + floor(random() * 26)::int];
  fiscal_code := fiscal_code || numbers[1 + floor(random() * 10)::int];
  fiscal_code := fiscal_code || numbers[1 + floor(random() * 10)::int];
  fiscal_code := fiscal_code || letters[1 + floor(random() * 26)::int];
  
  RETURN fiscal_code;
END;
$$ LANGUAGE plpgsql;

-- Aggiorna tutti gli utenti senza codice fiscale
UPDATE public.profiles 
SET fiscal_code = generate_realistic_fiscal_code()
WHERE fiscal_code IS NULL OR fiscal_code = '';

-- Aggiorna utenti senza telefono
UPDATE public.profiles 
SET phone = '+39 ' || 
  CASE 
    WHEN random() < 0.5 THEN '333'
    WHEN random() < 0.8 THEN '334'
    ELSE '335'
  END || ' ' ||
  LPAD(floor(random() * 1000)::text, 3, '0') || ' ' ||
  LPAD(floor(random() * 10000)::text, 4, '0')
WHERE phone IS NULL OR phone = '';

-- Rimuovi la funzione temporanea
DROP FUNCTION generate_realistic_fiscal_code();

-- Verifica i risultati
SELECT 
  user_id, 
  first_name, 
  last_name,
  phone, 
  fiscal_code,
  CASE 
    WHEN phone IS NOT NULL AND phone != '' AND fiscal_code IS NOT NULL AND fiscal_code != '' THEN 'OK'
    ELSE 'MANCANTE'
  END as status
FROM public.profiles 
ORDER BY first_name, last_name;