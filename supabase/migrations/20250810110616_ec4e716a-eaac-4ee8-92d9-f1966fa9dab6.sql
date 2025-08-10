
-- Assegna il ruolo di admin a Paolo Baldassare
INSERT INTO public.user_roles (user_id, role, granted_by, is_active)
VALUES (
  '9e88889a-b039-4cba-a6a7-bf399cde72a7'::uuid,
  'admin'::app_role,
  '9e88889a-b039-4cba-a6a7-bf399cde72a7'::uuid, -- auto-assegnato per il primo admin
  true
)
ON CONFLICT (user_id, role) DO UPDATE SET
  is_active = true,
  granted_at = now();

-- Verifica l'inserimento
SELECT 
  ur.role,
  ur.is_active,
  ur.granted_at,
  p.first_name || ' ' || p.last_name as user_name
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.user_id
WHERE ur.user_id = '9e88889a-b039-4cba-a6a7-bf399cde72a7'::uuid;
