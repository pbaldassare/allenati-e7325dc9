-- FASE 1: Eliminazione completa di 3 utenti specificati
-- Giuseppe Bianchi
DELETE FROM public.credits_transactions WHERE user_id = '1c5ef5d6-1ce3-4f70-99f1-de3c6a52ed8e';
DELETE FROM public.bookings WHERE user_id = '1c5ef5d6-1ce3-4f70-99f1-de3c6a52ed8e';
DELETE FROM public.user_subscriptions WHERE user_id = '1c5ef5d6-1ce3-4f70-99f1-de3c6a52ed8e';
DELETE FROM public.user_gym_memberships WHERE user_id = '1c5ef5d6-1ce3-4f70-99f1-de3c6a52ed8e';
DELETE FROM public.user_roles WHERE user_id = '1c5ef5d6-1ce3-4f70-99f1-de3c6a52ed8e';
DELETE FROM public.chat_participants WHERE user_id = '1c5ef5d6-1ce3-4f70-99f1-de3c6a52ed8e';
DELETE FROM public.chat_messages WHERE user_id = '1c5ef5d6-1ce3-4f70-99f1-de3c6a52ed8e';
DELETE FROM public.gym_credits WHERE user_id = '1c5ef5d6-1ce3-4f70-99f1-de3c6a52ed8e';
DELETE FROM public.profiles WHERE user_id = '1c5ef5d6-1ce3-4f70-99f1-de3c6a52ed8e';

-- Utente Tre
DELETE FROM public.credits_transactions WHERE user_id = 'bb5bb0f0-05af-444b-af2f-59dbbad5b76e';
DELETE FROM public.bookings WHERE user_id = 'bb5bb0f0-05af-444b-af2f-59dbbad5b76e';
DELETE FROM public.user_subscriptions WHERE user_id = 'bb5bb0f0-05af-444b-af2f-59dbbad5b76e';
DELETE FROM public.user_gym_memberships WHERE user_id = 'bb5bb0f0-05af-444b-af2f-59dbbad5b76e';
DELETE FROM public.user_roles WHERE user_id = 'bb5bb0f0-05af-444b-af2f-59dbbad5b76e';
DELETE FROM public.chat_participants WHERE user_id = 'bb5bb0f0-05af-444b-af2f-59dbbad5b76e';
DELETE FROM public.chat_messages WHERE user_id = 'bb5bb0f0-05af-444b-af2f-59dbbad5b76e';
DELETE FROM public.gym_credits WHERE user_id = 'bb5bb0f0-05af-444b-af2f-59dbbad5b76e';
DELETE FROM public.profiles WHERE user_id = 'bb5bb0f0-05af-444b-af2f-59dbbad5b76e';

-- Paolo Prova
DELETE FROM public.credits_transactions WHERE user_id = '1ba39b60-18cf-4b96-8ed1-94ec696dc178';
DELETE FROM public.bookings WHERE user_id = '1ba39b60-18cf-4b96-8ed1-94ec696dc178';
DELETE FROM public.user_subscriptions WHERE user_id = '1ba39b60-18cf-4b96-8ed1-94ec696dc178';
DELETE FROM public.user_gym_memberships WHERE user_id = '1ba39b60-18cf-4b96-8ed1-94ec696dc178';
DELETE FROM public.user_roles WHERE user_id = '1ba39b60-18cf-4b96-8ed1-94ec696dc178';
DELETE FROM public.chat_participants WHERE user_id = '1ba39b60-18cf-4b96-8ed1-94ec696dc178';
DELETE FROM public.chat_messages WHERE user_id = '1ba39b60-18cf-4b96-8ed1-94ec696dc178';
DELETE FROM public.gym_credits WHERE user_id = '1ba39b60-18cf-4b96-8ed1-94ec696dc178';
DELETE FROM public.profiles WHERE user_id = '1ba39b60-18cf-4b96-8ed1-94ec696dc178';

-- FASE 2: Aggiornamento formato telefono per 11 utenti
-- Aggiungere +39 ai numeri che non ce l'hanno
UPDATE public.profiles 
SET phone = '+39 ' || phone
WHERE user_id IN (
  'b7e02e44-db93-4b85-94e3-4f8cfc1fe9b3',  -- fabio pititto (3336225319)
  'aadb8e65-a5bb-48d9-8b7c-4b8da946a81a',  -- fabio pititto (3331234567) 
  '8da2d23c-ebb9-42c1-b844-bfafcdc03b5a',  -- Fabio Pititto (3336225319)
  'b81d2aa9-ee60-46f5-8b98-0e7096d83a0f',  -- Filippo Fagiolo (3209153119)
  '3b4e7f3d-efce-47c7-b3a1-e8b8b8b8b8b8',  -- Giovanni Maniga (3356806431)
  'e3acdc05-d050-4997-a1c0-2331589d0665',  -- Margherita Antonelli (3281213025)
  'c5e7f9a1-b2d4-4e6f-8a9b-1c2d3e4f5a6b',  -- paolo baldassare (3281213025)
  '7f8a9b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c',  -- paoluzzo baldassare (595985)
  '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',  -- Pietri Paolk (32595955)
  '9b8a7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',  -- prova cibarius (3281213025)
  '5c4d3e2f-1a0b-9c8d-7e6f-5a4b3c2d1e0f'   -- Test Finale (3281213025)
)
AND phone IS NOT NULL 
AND phone != ''
AND phone NOT LIKE '+39%';