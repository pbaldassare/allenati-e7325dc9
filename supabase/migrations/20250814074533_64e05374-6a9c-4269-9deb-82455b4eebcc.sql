-- Aggiungere campo nickname alla tabella profiles
ALTER TABLE public.profiles 
ADD COLUMN nickname TEXT;

-- Normalizzare i nomi esistenti (rimuovere spazi extra e caratteri speciali)
UPDATE public.profiles 
SET 
  first_name = TRIM(REGEXP_REPLACE(first_name, '\s+', ' ', 'g')),
  last_name = TRIM(REGEXP_REPLACE(last_name, '\s+', ' ', 'g'))
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;

-- Gestire i nomi generici "Nome Cognome" 
UPDATE public.profiles 
SET 
  first_name = NULL,
  last_name = NULL
WHERE (first_name = 'Nome' AND last_name = 'Cognome') 
   OR (first_name = 'Nome' AND last_name IS NULL)
   OR (first_name IS NULL AND last_name = 'Cognome');

-- Rimuovere ruoli duplicati mantenendo solo il più alto per utente
DELETE FROM public.user_roles ur1
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur2
  WHERE ur2.user_id = ur1.user_id
    AND ur2.id != ur1.id
    AND CASE ur2.role
      WHEN 'admin' THEN 1
      WHEN 'gym_owner' THEN 2
      WHEN 'instructor' THEN 3
      WHEN 'basic_user' THEN 4
    END < CASE ur1.role
      WHEN 'admin' THEN 1
      WHEN 'gym_owner' THEN 2
      WHEN 'instructor' THEN 3
      WHEN 'basic_user' THEN 4
    END
);

-- Aggiungere constraint per nickname unico (opzionale)
CREATE UNIQUE INDEX idx_profiles_nickname_unique 
ON public.profiles (nickname) 
WHERE nickname IS NOT NULL;

-- Aggiungere funzione per validazione nomi
CREATE OR REPLACE FUNCTION public.validate_profile_names()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalizzare nomi automaticamente
  NEW.first_name = CASE 
    WHEN NEW.first_name IS NOT NULL THEN TRIM(REGEXP_REPLACE(NEW.first_name, '\s+', ' ', 'g'))
    ELSE NULL 
  END;
  
  NEW.last_name = CASE 
    WHEN NEW.last_name IS NOT NULL THEN TRIM(REGEXP_REPLACE(NEW.last_name, '\s+', ' ', 'g'))
    ELSE NULL 
  END;
  
  NEW.nickname = CASE 
    WHEN NEW.nickname IS NOT NULL THEN TRIM(REGEXP_REPLACE(NEW.nickname, '\s+', ' ', 'g'))
    ELSE NULL 
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aggiungere trigger per validazione automatica
CREATE TRIGGER validate_profile_names_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_names();