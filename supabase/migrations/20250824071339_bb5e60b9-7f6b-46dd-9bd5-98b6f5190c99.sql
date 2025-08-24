-- Complete system reset: Remove all subscription plans, user subscriptions, bookings, and credits

-- 1. Delete all bookings
DELETE FROM public.bookings;

-- 2. Delete all credit transactions  
DELETE FROM public.credits_transactions;

-- 3. Delete all gym credits
DELETE FROM public.gym_credits;

-- 4. Reset current_credits in all profiles to 0
UPDATE public.profiles SET current_credits = 0;

-- 5. Delete all user subscriptions
DELETE FROM public.user_subscriptions;

-- 6. Delete all subscription plans
DELETE FROM public.subscription_plans;

-- Log the reset operation
INSERT INTO public.app_content (key, title, content, target_audience) 
VALUES (
  'system_reset_2024', 
  'Sistema Reset Completato', 
  'Reset completo del sistema: eliminati tutti i piani abbonamento, abbonamenti utenti, prenotazioni e crediti per permettere la creazione di piani personalizzati da zero.',
  ARRAY['admin']
);