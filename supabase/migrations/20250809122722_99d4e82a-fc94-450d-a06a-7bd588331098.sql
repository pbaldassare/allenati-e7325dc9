-- =====================================================
-- SEMPLIFICAZIONE FINALE DEI RUOLI
-- =====================================================

-- 1. PULIRE I DATI INCOMPATIBILI
DELETE FROM public.user_roles WHERE role IN ('super_admin', 'staff', 'premium_user');
DELETE FROM public.role_permissions WHERE role IN ('super_admin', 'staff', 'premium_user');

-- 2. CREARE NUOVO ENUM (CON NOME DIVERSO)
CREATE TYPE public.gym_role AS ENUM ('admin', 'gym_owner', 'instructor', 'basic_user');

-- 3. AGGIUNGERE COLONNA TEMPORANEA E MIGRARE I DATI
ALTER TABLE public.user_roles ADD COLUMN new_role gym_role;
ALTER TABLE public.role_permissions ADD COLUMN new_role gym_role;

-- Convertire i ruoli esistenti
UPDATE public.user_roles SET new_role = 'admin' WHERE role = 'admin';
UPDATE public.user_roles SET new_role = 'instructor' WHERE role = 'instructor';
UPDATE public.user_roles SET new_role = 'basic_user' WHERE role = 'basic_user';

UPDATE public.role_permissions SET new_role = 'admin' WHERE role = 'admin';
UPDATE public.role_permissions SET new_role = 'instructor' WHERE role = 'instructor';
UPDATE public.role_permissions SET new_role = 'basic_user' WHERE role = 'basic_user';

-- 4. RIMUOVERE FUNZIONI DIPENDENTI E COLONNE VECCHIE
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.is_backoffice_user(uuid);

ALTER TABLE public.user_roles DROP COLUMN role;
ALTER TABLE public.role_permissions DROP COLUMN role;

-- Rinominare le colonne
ALTER TABLE public.user_roles RENAME COLUMN new_role TO role;
ALTER TABLE public.role_permissions RENAME COLUMN new_role TO role;

-- Aggiungere NOT NULL constraint
ALTER TABLE public.user_roles ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.role_permissions ALTER COLUMN role SET NOT NULL;

-- 5. RICREARE CONSTRAINTS UNICI
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE(user_id, role);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_permission_id_key UNIQUE(role, permission_id);

-- 6. RICREARE LE FUNZIONI CON IL NUOVO ENUM
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role gym_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.is_backoffice_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'gym_owner', 'instructor')
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 7. RIMUOVERE ENUM VECCHIO E RINOMINARE QUELLO NUOVO
DROP TYPE public.app_role CASCADE;
ALTER TYPE public.gym_role RENAME TO app_role;

-- 8. CREARE TABELLA PALESTRE
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
    owner_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. AGGIUNGERE GYM_ID SE NON ESISTE
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

-- 10. INSERIRE DATI DI TEST
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

UPDATE public.course_categories SET gym_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- 11. CREARE INDICI
CREATE INDEX IF NOT EXISTS idx_gyms_owner_email ON public.gyms(owner_email);
CREATE INDEX IF NOT EXISTS idx_instructors_gym_id ON public.instructors(gym_id);
CREATE INDEX IF NOT EXISTS idx_courses_gym_id ON public.courses(gym_id);
CREATE INDEX IF NOT EXISTS idx_course_categories_gym_id ON public.course_categories(gym_id);