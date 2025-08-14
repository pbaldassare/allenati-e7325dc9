-- Pulizia e preparazione database abbonamenti

-- 1. Pulire piani duplicati mantenendo solo quelli essenziali
DELETE FROM public.subscription_plans 
WHERE name NOT IN ('4 Lezioni', '10 Lezioni', 'Unlimited Mensile', 'Unlimited Annuale', 'Prova Gratuita');

-- 2. Aggiornare/inserire piani standard
INSERT INTO public.subscription_plans (name, description, price, duration_days, credits_included, unlimited_access, is_trial, features) 
VALUES 
  ('Prova Gratuita', 'Prova gratuita di 7 giorni', 0, 7, 3, false, true, ARRAY['3 lezioni gratuite', 'Accesso a tutte le classi', 'Supporto base']),
  ('4 Lezioni', 'Pacchetto 4 lezioni', 0, 30, 4, false, false, ARRAY['4 lezioni al mese', 'Accesso a tutte le classi', 'Supporto']),
  ('10 Lezioni', 'Pacchetto 10 lezioni', 0, 30, 10, false, false, ARRAY['10 lezioni al mese', 'Accesso a tutte le classi', 'Supporto prioritario']),
  ('Unlimited Mensile', 'Accesso illimitato mensile', 0, 30, 0, true, false, ARRAY['Lezioni illimitate', 'Accesso a tutte le classi', 'Supporto prioritario', 'Eventi speciali']),
  ('Unlimited Annuale', 'Accesso illimitato annuale', 0, 365, 0, true, false, ARRAY['Lezioni illimitate', 'Accesso a tutte le classi', 'Supporto prioritario', 'Eventi speciali', 'Sconto annuale'])
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days,
  credits_included = EXCLUDED.credits_included,
  unlimited_access = EXCLUDED.unlimited_access,
  is_trial = EXCLUDED.is_trial,
  features = EXCLUDED.features,
  is_active = true;

-- 3. Aggiornare schedules di corsi esistenti senza sala con "Sala 1" di default
UPDATE public.course_schedules 
SET room_name = 'Sala 1'
WHERE room_name IS NULL OR room_name = '';

-- 4. Assegnare abbonamento base agli utenti esistenti senza abbonamento attivo
WITH default_plan AS (
  SELECT id FROM public.subscription_plans 
  WHERE name = '4 Lezioni' AND is_active = true 
  LIMIT 1
),
users_without_subscription AS (
  SELECT p.user_id
  FROM public.profiles p
  LEFT JOIN public.user_subscriptions us ON p.user_id = us.user_id 
    AND us.status = 'active' 
    AND (us.expires_at IS NULL OR us.expires_at > now())
  WHERE us.id IS NULL
)
INSERT INTO public.user_subscriptions (user_id, plan_id, status, starts_at, expires_at)
SELECT 
  uws.user_id,
  dp.id,
  'active',
  now(),
  now() + INTERVAL '30 days'
FROM users_without_subscription uws, default_plan dp;