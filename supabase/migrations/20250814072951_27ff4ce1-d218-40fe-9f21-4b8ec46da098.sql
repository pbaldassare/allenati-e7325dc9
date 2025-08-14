-- Rimuovi il piano "Prova Gratuita" 
DELETE FROM public.subscription_plans 
WHERE id = '4b3371ac-81bc-4ba7-9f3f-65de47a7d11f';

-- Aggiorna i piani esistenti con descrizioni migliorate e rimuovi riferimenti a "gratuito"
UPDATE public.subscription_plans 
SET 
  description = 'Ideale per chi inizia il percorso di allenamento',
  features = ARRAY['4 lezioni al mese', 'Accesso app completo', 'Supporto base', 'Prenotazione facile']
WHERE name = '4 Lezioni';

UPDATE public.subscription_plans 
SET 
  description = 'Perfetto per un allenamento costante e regolare',
  features = ARRAY['10 lezioni al mese', 'Accesso app completo', 'Supporto prioritario', 'Prenotazione anticipata', 'Accesso eventi speciali']
WHERE name = '10 Lezioni';

UPDATE public.subscription_plans 
SET 
  description = 'Massima flessibilità per gli atleti più dedicati',
  features = ARRAY['Lezioni illimitate', 'Tutti i corsi inclusi', 'Accesso prioritario', 'Supporto premium', 'Eventi speciali esclusivi', 'Accesso anticipato nuovi corsi']
WHERE name = 'Unlimited Mensile';

UPDATE public.subscription_plans 
SET 
  description = 'Il piano più conveniente per un anno di allenamento intenso',
  features = ARRAY['Lezioni illimitate', 'Tutti i corsi inclusi', 'Accesso prioritario', 'Supporto premium VIP', 'Eventi speciali esclusivi', 'Accesso anticipato nuovi corsi', 'Sconto annuale']
WHERE name = 'Unlimited Annuale';