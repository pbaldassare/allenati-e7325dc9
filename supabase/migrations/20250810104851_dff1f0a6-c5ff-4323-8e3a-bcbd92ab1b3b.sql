-- =====================================================
-- DATI DI TEST PER L'APPLICAZIONE
-- =====================================================

-- 1. INSERIMENTO PALESTRA DI TEST
INSERT INTO public.gyms (id, name, description, address, city, postal_code, phone, email, website, owner_email) 
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'FitnessPro Milano',
  'La palestra più moderna di Milano con attrezzature all''avanguardia',
  'Via Roma 123',
  'Milano',
  '20100',
  '+39 02 1234567',
  'info@fitnesspro.it',
  'https://fitnesspro.it',
  'owner@fitnesspro.it'
) ON CONFLICT (id) DO NOTHING;

-- 2. INSERIMENTO CATEGORIE CORSI
INSERT INTO public.course_categories (id, name, description, color_hex, icon_name, gym_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Fitness', 'Allenamento generale e potenziamento', '#3B82F6', 'Dumbbell', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Yoga', 'Rilassamento e stretching', '#10B981', 'TreePine', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Cardio', 'Allenamento cardiovascolare', '#EF4444', 'Heart', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'Pilates', 'Controllo e precisione dei movimenti', '#8B5CF6', 'Circle', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid)
ON CONFLICT (id) DO NOTHING;

-- 3. INSERIMENTO PIANI DI ABBONAMENTO
INSERT INTO public.subscription_plans (id, name, description, price, duration_days, credits_included, unlimited_access, features) VALUES
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, 'Base', 'Piano base per iniziare', 29.99, 30, 8, false, ARRAY['8 lezioni al mese', 'Accesso alla palestra', 'Supporto base']),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, 'Premium', 'Piano completo per utenti attivi', 49.99, 30, 20, false, ARRAY['20 lezioni al mese', 'Accesso illimitato', 'Consulenze personalizzate', 'App mobile']),
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, 'VIP', 'Accesso illimitato e servizi premium', 79.99, 30, 0, true, ARRAY['Accesso illimitato', 'Personal trainer dedicato', 'Programmi personalizzati', 'Nutrizione'])
ON CONFLICT (id) DO NOTHING;

-- 4. INSERIMENTO PRODOTTI SHOP
INSERT INTO public.products (id, name, description, price, category, sku, stock_quantity, images, features) VALUES
  ('750e8400-e29b-41d4-a716-446655440001'::uuid, 'Shaker Premium', 'Borraccia shaker da 700ml con scomparto per integratori', 19.99, 'Accessori', 'SHK001', 50, 
   ARRAY['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'], 
   ARRAY['700ml di capacità', 'Scomparto integratori', 'BPA Free', 'Lavabile in lavastoviglie']),
   
  ('750e8400-e29b-41d4-a716-446655440002'::uuid, 'Tappetino Yoga', 'Tappetino antiscivolo per yoga e pilates', 34.99, 'Accessori', 'MAT001', 30,
   ARRAY['https://images.unsplash.com/photo-1506629905270-11674df07568?w=400'],
   ARRAY['Materiale eco-friendly', 'Antiscivolo', '6mm di spessore', 'Cinghia inclusa']),
   
  ('750e8400-e29b-41d4-a716-446655440003'::uuid, 'Whey Protein 1kg', 'Proteine del siero del latte gusto vaniglia', 39.99, 'Integratori', 'PROT001', 25,
   ARRAY['https://images.unsplash.com/photo-1609501676725-7186f0afa4ca?w=400'],
   ARRAY['1kg di proteine', 'Gusto vaniglia', '25g proteine per dose', 'Senza glutine'])
ON CONFLICT (id) DO NOTHING;

-- 5. CONFERMA INSERIMENTO
SELECT 'Palestre inserite: ' || COUNT(*)::text as risultato FROM public.gyms
UNION ALL
SELECT 'Categorie corsi: ' || COUNT(*)::text FROM public.course_categories
UNION ALL
SELECT 'Piani abbonamento: ' || COUNT(*)::text FROM public.subscription_plans  
UNION ALL
SELECT 'Prodotti shop: ' || COUNT(*)::text FROM public.products;