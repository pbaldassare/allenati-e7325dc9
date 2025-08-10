-- Assegna il ruolo di gym_owner all'utente palestra
INSERT INTO public.user_roles (user_id, role, granted_by, is_active)
VALUES (
  'ce7f2480-aaa3-4058-b786-7a1600df55b3'::uuid,
  'gym_owner'::app_role,
  '9e88889a-b039-4cba-a6a7-bf399cde72a7'::uuid, -- assegnato dall'admin Paolo
  true
)
ON CONFLICT (user_id, role) DO UPDATE SET
  is_active = true,
  granted_at = now();

-- Verifica i ruoli assegnati a tutti gli utenti
SELECT 
  ur.role,
  ur.is_active,
  ur.granted_at,
  p.first_name || ' ' || p.last_name as user_name,
  au.email
FROM public.user_roles ur
JOIN public.profiles p ON ur.user_id = p.user_id
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.is_active = true
ORDER BY ur.granted_at DESC;