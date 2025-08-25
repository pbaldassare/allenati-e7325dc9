-- Correggere il piano "Piano da 10 entrate" che ha unlimited_access = true ma dovrebbe essere false
-- e assicurarsi che abbia credits_included = 10

-- Prima vediamo i piani attuali che potrebbero avere problemi
SELECT id, name, unlimited_access, credits_included, duration_days, is_active
FROM subscription_plans 
WHERE name ILIKE '%10%entrate%' OR name ILIKE '%entrate%' OR (unlimited_access = true AND credits_included > 0);

-- Correggiamo il piano "da 10 entrate" che dovrebbe essere a crediti, non illimitato
UPDATE subscription_plans 
SET 
  unlimited_access = false,
  credits_included = 10,
  duration_days = 60
WHERE name ILIKE '%10%entrate%' OR name ILIKE '%entrate%';

-- Correggiamo eventuali piani che hanno unlimited_access = true ma anche credits_included > 0 
-- (situazione non valida - se è illimitato non dovrebbe avere crediti)
UPDATE subscription_plans 
SET credits_included = 0 
WHERE unlimited_access = true AND credits_included > 0;

-- Visualizziamo il risultato delle correzioni
SELECT id, name, unlimited_access, credits_included, duration_days, is_active, features
FROM subscription_plans 
ORDER BY created_at DESC;