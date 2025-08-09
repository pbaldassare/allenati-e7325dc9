-- =====================================================
-- SEMPLIFICAZIONE RUOLI E AGGIUNTA GESTIONE MULTI-PALESTRA
-- =====================================================

-- 1. AGGIORNARE ENUM RUOLI (rimuovere ruoli non necessari e aggiungere gym_owner)
ALTER TYPE public.app_role RENAME TO app_role_old;

CREATE TYPE public.app_role AS ENUM ('admin', 'gym_owner', 'instructor', 'basic_user');

-- Aggiornare le tabelle che usano l'enum
ALTER TABLE public.user_roles ALTER COLUMN role TYPE app_role USING role::text::app_role;
ALTER TABLE public.role_permissions ALTER COLUMN role TYPE app_role USING role::text::app_role;

-- Rimuovere l'enum vecchio
DROP TYPE public.app_role_old;

-- 2. CREARE TABELLA PALESTRE
CREATE TABLE public.gyms (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    opening_hours JSONB, -- es: {"monday": {"open": "06:00", "close": "22:00"}}
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. AGGIUNGERE GYM_ID ALLE TABELLE RILEVANTI
ALTER TABLE public.instructors ADD COLUMN gym_id UUID REFERENCES public.gyms(id);
ALTER TABLE public.courses ADD COLUMN gym_id UUID REFERENCES public.gyms(id);
ALTER TABLE public.course_categories ADD COLUMN gym_id UUID REFERENCES public.gyms(id);

-- 4. ABILITARE RLS SU GYMS
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- 5. TRIGGER PER TIMESTAMP AUTOMATICI
CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. AGGIORNARE FUNZIONI DI UTILITÀ PER MULTI-PALESTRA
CREATE OR REPLACE FUNCTION public.is_gym_owner(_user_id UUID, _gym_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gyms
    WHERE id = _gym_id
      AND owner_id = _user_id
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_gym_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT gym_id
  FROM public.instructors
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 7. AGGIORNARE PERMESSI PER I NUOVI RUOLI
DELETE FROM public.role_permissions;
DELETE FROM public.permissions;

-- Reinserire permessi semplificati
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

-- Assegnazione permessi ai ruoli
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

-- 8. INSERIRE DATI DI TEST

-- Palestra di esempio
INSERT INTO public.gyms (id, name, description, address, city, postal_code, phone, email, owner_id) 
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Fight Club Milano',
    'Palestra di arti marziali nel centro di Milano',
    'Via Roma 123',
    'Milano',
    '20121',
    '+39 02 1234567',
    'info@fightclubmi.it',
    'f47ac10b-58cc-4372-a567-0e02b2c3d480' -- owner_id che useremo per gym_owner
);

-- Aggiornare le categorie esistenti per associarle alla palestra
UPDATE public.course_categories SET gym_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- 9. CREARE UTENTI FAKE PER OGNI LIVELLO
-- (Questi verranno creati nel trigger quando gli utenti si registrano, 
-- ma per ora creiamo solo i ruoli che verranno assegnati)

-- Simuliamo la presenza di 4 utenti con questi ID:
-- Admin: f47ac10b-58cc-4372-a567-0e02b2c3d481
-- Gym Owner: f47ac10b-58cc-4372-a567-0e02b2c3d480
-- Instructor: f47ac10b-58cc-4372-a567-0e02b2c3d482  
-- Basic User: f47ac10b-58cc-4372-a567-0e02b2c3d483

-- Creiamo i profili fake (normalmente vengono creati dal trigger)
INSERT INTO public.profiles (user_id, first_name, last_name, phone, city) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Mario', 'Rossi', '+39 333 1111111', 'Milano'),
('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Giuseppe', 'Verdi', '+39 333 2222222', 'Milano'),
('f47ac10b-58cc-4372-a567-0e02b2c3d482', 'Anna', 'Bianchi', '+39 333 3333333', 'Milano'),
('f47ac10b-58cc-4372-a567-0e02b2c3d483', 'Luca', 'Neri', '+39 333 4444444', 'Milano');

-- Assegniamo i ruoli
INSERT INTO public.user_roles (user_id, role) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'admin'),
('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'gym_owner'),
('f47ac10b-58cc-4372-a567-0e02b2c3d482', 'instructor'),
('f47ac10b-58cc-4372-a567-0e02b2c3d483', 'basic_user');

-- Creiamo l'istruttore collegato alla palestra
INSERT INTO public.instructors (user_id, gym_id, bio, specializations, experience_years) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
 'Istruttore di Brazilian Jiu-Jitsu con 10 anni di esperienza', 
 ARRAY['BJJ', 'MMA'], 10);

-- 10. AGGIORNARE CONFIGURAZIONI ADMIN
UPDATE public.admin_settings 
SET value = '"Fight Club Milano"'
WHERE key = 'gym_name';

UPDATE public.admin_settings 
SET value = '"Via Roma 123, Milano"'
WHERE key = 'gym_address';

-- 11. INDICI PER PERFORMANCE
CREATE INDEX idx_gyms_owner_id ON public.gyms(owner_id);
CREATE INDEX idx_instructors_gym_id ON public.instructors(gym_id);
CREATE INDEX idx_courses_gym_id ON public.courses(gym_id);
CREATE INDEX idx_course_categories_gym_id ON public.course_categories(gym_id);