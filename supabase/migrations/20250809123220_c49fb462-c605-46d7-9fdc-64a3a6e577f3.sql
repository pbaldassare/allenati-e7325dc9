-- =====================================================
-- AGGIUNTA PERMESSI E DATI UTENTI FAKE
-- =====================================================

-- 1. PULIRE E INSERIRE PERMESSI
DELETE FROM public.role_permissions;
DELETE FROM public.permissions;

INSERT INTO public.permissions (name, description, resource, action, access_level) VALUES
-- Permessi Admin (vede tutto)
('manage_all_gyms', 'Gestione completa di tutte le palestre', 'gyms', 'all', 'backoffice'),
('manage_all_users', 'Gestione completa di tutti gli utenti', 'users', 'all', 'backoffice'),
('manage_all_courses', 'Gestione completa di tutti i corsi', 'courses', 'all', 'backoffice'),
('view_all_reports', 'Visualizzazione di tutti i report', 'reports', 'read', 'backoffice'),

-- Permessi Gym Owner (solo sue palestre)
('manage_own_gym', 'Gestione della propria palestra', 'gyms', 'own', 'backoffice'),
('manage_gym_users', 'Gestione utenti della propria palestra', 'users', 'gym', 'backoffice'),
('manage_gym_courses', 'Gestione corsi della propria palestra', 'courses', 'gym', 'backoffice'),
('manage_gym_instructors', 'Gestione istruttori della propria palestra', 'instructors', 'gym', 'backoffice'),
('view_gym_reports', 'Visualizzazione report della propria palestra', 'reports', 'gym', 'backoffice'),

-- Permessi Instructor (solo propri corsi)
('view_own_courses', 'Visualizzazione dei propri corsi', 'courses', 'own', 'both'),
('manage_own_schedule', 'Gestione del proprio calendario', 'schedule', 'own', 'both'),
('view_course_bookings', 'Visualizzazione prenotazioni dei propri corsi', 'bookings', 'course', 'both'),

-- Permessi Basic User (cliente)
('view_courses', 'Visualizzazione corsi disponibili', 'courses', 'read', 'mobile'),
('create_booking', 'Creare prenotazioni', 'bookings', 'create', 'mobile'),
('view_own_bookings', 'Visualizzazione delle proprie prenotazioni', 'bookings', 'own', 'mobile'),
('manage_own_profile', 'Gestione del proprio profilo', 'profile', 'own', 'mobile'),
('view_own_payments', 'Visualizzazione dei propri pagamenti', 'payments', 'own', 'mobile');

-- 2. ASSEGNARE PERMESSI AI RUOLI
-- Admin ha tutti i permessi
INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'admin', id FROM public.permissions;

-- Gym Owner
INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'gym_owner', id FROM public.permissions 
WHERE name IN ('manage_own_gym', 'manage_gym_users', 'manage_gym_courses', 'manage_gym_instructors', 'view_gym_reports');

-- Instructor
INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'instructor', id FROM public.permissions 
WHERE name IN ('view_own_courses', 'manage_own_schedule', 'view_course_bookings', 'manage_own_profile');

-- Basic User
INSERT INTO public.role_permissions (role, permission_id) 
SELECT 'basic_user', id FROM public.permissions 
WHERE name IN ('view_courses', 'create_booking', 'view_own_bookings', 'manage_own_profile', 'view_own_payments');

-- 3. CREARE UTENTI FAKE PER TEST
-- NOTA: Questi profili e ruoli potranno essere collegati a utenti reali una volta implementata l'autenticazione

-- Simuliamo 4 utenti con ID fissi per test
INSERT INTO public.profiles (user_id, first_name, last_name, phone, city, bio) VALUES
-- Admin
('00000000-0000-0000-0000-000000000001', 'Mario', 'Rossi', '+39 333 1111111', 'Milano', 'Amministratore di sistema'),
-- Gym Owner  
('00000000-0000-0000-0000-000000000002', 'Giuseppe', 'Verdi', '+39 333 2222222', 'Milano', 'Proprietario Fight Club Milano'),
-- Instructor
('00000000-0000-0000-0000-000000000003', 'Anna', 'Bianchi', '+39 333 3333333', 'Milano', 'Istruttore di Brazilian Jiu-Jitsu'),
-- Basic User (Cliente)
('00000000-0000-0000-0000-000000000004', 'Luca', 'Neri', '+39 333 4444444', 'Milano', 'Cliente appassionato di arti marziali');

-- Assegniamo i ruoli
INSERT INTO public.user_roles (user_id, role) VALUES
('00000000-0000-0000-0000-000000000001', 'admin'),
('00000000-0000-0000-0000-000000000002', 'gym_owner'),
('00000000-0000-0000-0000-000000000003', 'instructor'),
('00000000-0000-0000-0000-000000000004', 'basic_user');

-- Creiamo l'istruttore collegato alla palestra
INSERT INTO public.instructors (user_id, gym_id, bio, specializations, experience_years, hourly_rate) VALUES
('00000000-0000-0000-0000-000000000003', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
 'Istruttore certificato di Brazilian Jiu-Jitsu con 10 anni di esperienza nelle competizioni', 
 ARRAY['BJJ', 'MMA', 'No-Gi'], 10, 50.00);

-- 4. AGGIORNARE CONFIGURAZIONI ADMIN
UPDATE public.admin_settings 
SET value = '"Fight Club Milano"'
WHERE key = 'gym_name';

-- 5. CREARE ALCUNI CORSI DI ESEMPIO COLLEGATI ALLA PALESTRA
INSERT INTO public.courses (name, description, category_id, instructor_id, gym_id, max_participants, duration_minutes, difficulty_level, price_per_session, credits_required) 
SELECT 
    'BJJ Principianti',
    'Corso di Brazilian Jiu-Jitsu per principianti',
    (SELECT id FROM public.course_categories WHERE name = 'BJJ' LIMIT 1),
    (SELECT id FROM public.instructors WHERE user_id = '00000000-0000-0000-0000-000000000003' LIMIT 1),
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    15,
    90,
    1,
    25.00,
    1
WHERE EXISTS (SELECT 1 FROM public.course_categories WHERE name = 'BJJ');

-- 6. FUNZIONE UTILITÀ PER OTTENERE RUOLO UTENTE
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1
      WHEN 'gym_owner' THEN 2  
      WHEN 'instructor' THEN 3
      WHEN 'basic_user' THEN 4
    END
  LIMIT 1
$$;