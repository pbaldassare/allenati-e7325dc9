-- Eliminazione completa di 7 utenti e tutti i loro dati correlati

-- 1. utenteapp test (cibariussrl@gmail.com)
-- Trova e elimina tutti i dati dell'utente
DELETE FROM public.credits_transactions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'cibariussrl@gmail.com'
);
DELETE FROM public.bookings WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'cibariussrl@gmail.com'
);
DELETE FROM public.user_subscriptions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'cibariussrl@gmail.com'
);
DELETE FROM public.user_gym_memberships WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'cibariussrl@gmail.com'
);
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'cibariussrl@gmail.com'
);
DELETE FROM public.chat_participants WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'cibariussrl@gmail.com'
);
DELETE FROM public.chat_messages WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'cibariussrl@gmail.com'
);
DELETE FROM public.gym_credits WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'cibariussrl@gmail.com'
);
DELETE FROM public.profiles WHERE email = 'cibariussrl@gmail.com';

-- 2. utentepalestra utentepalestra (palestra@gmail.com)
DELETE FROM public.credits_transactions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'palestra@gmail.com'
);
DELETE FROM public.bookings WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'palestra@gmail.com'
);
DELETE FROM public.user_subscriptions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'palestra@gmail.com'
);
DELETE FROM public.user_gym_memberships WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'palestra@gmail.com'
);
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'palestra@gmail.com'
);
DELETE FROM public.chat_participants WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'palestra@gmail.com'
);
DELETE FROM public.chat_messages WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'palestra@gmail.com'
);
DELETE FROM public.gym_credits WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'palestra@gmail.com'
);
DELETE FROM public.profiles WHERE email = 'palestra@gmail.com';

-- 3. prova cibarius (newbodysirmione@gmail.com)
DELETE FROM public.credits_transactions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'newbodysirmione@gmail.com'
);
DELETE FROM public.bookings WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'newbodysirmione@gmail.com'
);
DELETE FROM public.user_subscriptions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'newbodysirmione@gmail.com'
);
DELETE FROM public.user_gym_memberships WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'newbodysirmione@gmail.com'
);
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'newbodysirmione@gmail.com'
);
DELETE FROM public.chat_participants WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'newbodysirmione@gmail.com'
);
DELETE FROM public.chat_messages WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'newbodysirmione@gmail.com'
);
DELETE FROM public.gym_credits WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'newbodysirmione@gmail.com'
);
DELETE FROM public.profiles WHERE email = 'newbodysirmione@gmail.com';

-- 4. Pietri Paolk (utenteprova2@gmail.com)
DELETE FROM public.credits_transactions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'utenteprova2@gmail.com'
);
DELETE FROM public.bookings WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'utenteprova2@gmail.com'
);
DELETE FROM public.user_subscriptions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'utenteprova2@gmail.com'
);
DELETE FROM public.user_gym_memberships WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'utenteprova2@gmail.com'
);
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'utenteprova2@gmail.com'
);
DELETE FROM public.chat_participants WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'utenteprova2@gmail.com'
);
DELETE FROM public.chat_messages WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'utenteprova2@gmail.com'
);
DELETE FROM public.gym_credits WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'utenteprova2@gmail.com'
);
DELETE FROM public.profiles WHERE email = 'utenteprova2@gmail.com';

-- 5. Test Finale (testfinale@gmail.com)
DELETE FROM public.credits_transactions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'testfinale@gmail.com'
);
DELETE FROM public.bookings WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'testfinale@gmail.com'
);
DELETE FROM public.user_subscriptions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'testfinale@gmail.com'
);
DELETE FROM public.user_gym_memberships WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'testfinale@gmail.com'
);
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'testfinale@gmail.com'
);
DELETE FROM public.chat_participants WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'testfinale@gmail.com'
);
DELETE FROM public.chat_messages WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'testfinale@gmail.com'
);
DELETE FROM public.gym_credits WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'testfinale@gmail.com'
);
DELETE FROM public.profiles WHERE email = 'testfinale@gmail.com';

-- 6. Paol Cici (paolo.baldassrre@gmail.com)
DELETE FROM public.credits_transactions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paolo.baldassrre@gmail.com'
);
DELETE FROM public.bookings WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paolo.baldassrre@gmail.com'
);
DELETE FROM public.user_subscriptions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paolo.baldassrre@gmail.com'
);
DELETE FROM public.user_gym_memberships WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paolo.baldassrre@gmail.com'
);
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paolo.baldassrre@gmail.com'
);
DELETE FROM public.chat_participants WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paolo.baldassrre@gmail.com'
);
DELETE FROM public.chat_messages WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paolo.baldassrre@gmail.com'
);
DELETE FROM public.gym_credits WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paolo.baldassrre@gmail.com'
);
DELETE FROM public.profiles WHERE email = 'paolo.baldassrre@gmail.com';

-- 7. Test Paleo (paldassare@gmail.com)
DELETE FROM public.credits_transactions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paldassare@gmail.com'
);
DELETE FROM public.bookings WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paldassare@gmail.com'
);
DELETE FROM public.user_subscriptions WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paldassare@gmail.com'
);
DELETE FROM public.user_gym_memberships WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paldassare@gmail.com'
);
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paldassare@gmail.com'
);
DELETE FROM public.chat_participants WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paldassare@gmail.com'
);
DELETE FROM public.chat_messages WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paldassare@gmail.com'
);
DELETE FROM public.gym_credits WHERE user_id IN (
  SELECT user_id FROM public.profiles WHERE email = 'paldassare@gmail.com'
);
DELETE FROM public.profiles WHERE email = 'paldassare@gmail.com';