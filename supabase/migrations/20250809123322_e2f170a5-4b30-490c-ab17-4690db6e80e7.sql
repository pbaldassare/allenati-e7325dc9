-- =====================================================
-- COMPLETAMENTO CON FUNZIONI UTILITÀ
-- =====================================================

-- 1. FUNZIONE UTILITÀ PER OTTENERE RUOLO UTENTE
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

-- 2. FUNZIONE UTILITÀ PER CONTROLLO PERMESSI
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

-- 3. FUNZIONE PER OTTENERE PALESTRA DELL'UTENTE (se è istruttore)
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

-- 4. VERIFICARE CHE TUTTO SIA A POSTO
-- Mostriamo un riepilogo della configurazione
SELECT 'RUOLI CONFIGURATI' as info, role::text as valore FROM (SELECT DISTINCT role FROM public.user_roles) t
UNION ALL
SELECT 'PALESTRE CONFIGURATE' as info, name as valore FROM public.gyms
UNION ALL
SELECT 'PERMESSI CONFIGURATI' as info, COUNT(*)::text as valore FROM public.permissions
UNION ALL
SELECT 'CATEGORIE CORSI' as info, COUNT(*)::text as valore FROM public.course_categories WHERE gym_id IS NOT NULL;