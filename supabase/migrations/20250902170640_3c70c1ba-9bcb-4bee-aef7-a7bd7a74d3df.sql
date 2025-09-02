-- Aggiorna tutti gli utenti con cintura NULL impostandola a 'Bianca'
UPDATE public.profiles 
SET belt = 'Bianca'::belt_level 
WHERE belt IS NULL;