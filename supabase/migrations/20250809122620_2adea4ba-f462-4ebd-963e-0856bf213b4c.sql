-- =====================================================
-- COMPLETAMENTO SEMPLIFICAZIONE CON DATI COERENTI
-- =====================================================

-- 1. ELIMINARE TUTTO PER RICOMINCIARE PULITO
DROP TABLE IF EXISTS public.gyms CASCADE;
DELETE FROM public.user_roles;
DELETE FROM public.role_permissions;
DELETE FROM public.permissions;
DELETE FROM public.profiles WHERE user_id IN ('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d483');

-- 2. RICREARE TABELLA PALESTRE (senza FK verso auth.users per ora)
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
    opening_hours JSONB,
    owner_email TEXT, -- Usiamo email invece di user_id per semplicità
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. AGGIUNGERE GYM_ID ALLE TABELLE (se non esistono già)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instructors' AND column_name = 'gym_id') THEN
        ALTER TABLE public.instructors ADD COLUMN gym_id UUID REFERENCES public.gyms(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'gym_id') THEN
        ALTER TABLE public.courses ADD COLUMN gym_id UUID REFERENCES public.gyms(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_categories' AND column_name = 'gym_id') THEN
        ALTER TABLE public.course_categories ADD COLUMN gym_id UUID REFERENCES public.gyms(id);
    END IF;
END $$;

-- 4. AGGIORNARE FUNZIONI UTILITÀ
CREATE OR REPLACE FUNCTION public.is_gym_owner_by_email(_email TEXT, _gym_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gyms
    WHERE id = _gym_id
      AND owner_email = _email
      AND is_active = true
  )
$$;

-- 5. INSERIRE PERMESSI SEMPLIFICATI
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

-- 6. ASSEGNARE PERMESSI AI RUOLI
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

-- 7. INSERIRE DATI DI TEST
INSERT INTO public.gyms (id, name, description, address, city, postal_code, phone, email, owner_email) 
VALUES (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Fight Club Milano',
    'Palestra di arti marziali nel centro di Milano',
    'Via Roma 123',
    'Milano',
    '20121',
    '+39 02 1234567',
    'info@fightclubmi.it',
    'gym.owner@test.com'
);

-- Aggiornare le categorie esistenti per associarle alla palestra
UPDATE public.course_categories SET gym_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- 8. CREARE INDICI
CREATE INDEX IF NOT EXISTS idx_gyms_owner_email ON public.gyms(owner_email);
CREATE INDEX IF NOT EXISTS idx_instructors_gym_id ON public.instructors(gym_id);
CREATE INDEX IF NOT EXISTS idx_courses_gym_id ON public.courses(gym_id);
CREATE INDEX IF NOT EXISTS idx_course_categories_gym_id ON public.course_categories(gym_id);