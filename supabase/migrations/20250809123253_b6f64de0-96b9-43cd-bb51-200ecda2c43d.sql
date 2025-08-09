-- =====================================================
-- CONFIGURAZIONE PERMESSI SENZA UTENTI FAKE
-- =====================================================

-- 1. INSERIRE PERMESSI SEMPLIFICATI
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

-- 3. FUNZIONE UTILITÀ PER OTTENERE RUOLO UTENTE
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

-- 4. FUNZIONE UTILITÀ PER CONTROLLO PERMESSI
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id UUID, _permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.name = _permission_name
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  )
$$;