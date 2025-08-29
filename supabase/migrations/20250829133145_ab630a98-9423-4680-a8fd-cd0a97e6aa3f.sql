-- Correzione della migration precedente - rimuoviamo la policy duplicata

-- 1. Creiamo una funzione di debug per verificare i permessi dell'utente
CREATE OR REPLACE FUNCTION public.debug_user_permissions(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  user_gym_id uuid;
  user_roles_array text[];
  gym_memberships jsonb;
BEGIN
  -- Get user gym ID
  SELECT get_user_gym_id(_user_id) INTO user_gym_id;
  
  -- Get user roles
  SELECT ARRAY_AGG(role::text) INTO user_roles_array
  FROM user_roles 
  WHERE user_id = _user_id AND is_active = true;
  
  -- Get gym memberships
  SELECT jsonb_agg(
    jsonb_build_object(
      'gym_id', gym_id,
      'membership_type', membership_type,
      'status', status,
      'gym_name', (SELECT name FROM gyms WHERE id = ugm.gym_id)
    )
  ) INTO gym_memberships
  FROM user_gym_memberships ugm 
  WHERE user_id = _user_id;
  
  -- Build result
  result := jsonb_build_object(
    'user_id', _user_id,
    'primary_gym_id', user_gym_id,
    'roles', COALESCE(user_roles_array, ARRAY[]::text[]),
    'memberships', COALESCE(gym_memberships, '[]'::jsonb),
    'has_gym_owner_role', has_role(_user_id, 'gym_owner'::app_role),
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- 2. Miglioriamo la policy per user_gym_memberships
DROP POLICY IF EXISTS "Gym owners can view memberships for their gym" ON user_gym_memberships;
CREATE POLICY "Gym owners can view memberships for their gym" 
ON user_gym_memberships 
FOR SELECT 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  (gym_id = get_user_gym_id(auth.uid()) OR 
   -- Aggiungiamo anche controllo diretto per Combat Lab
   (gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701'::uuid AND 
    auth.uid() = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'::uuid))
);

-- 3. Miglioriamo la policy per user_subscriptions 
DROP POLICY IF EXISTS "Gym owners can view gym member subscriptions" ON user_subscriptions;
CREATE POLICY "Gym owners can view gym member subscriptions" 
ON user_subscriptions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  (user_id IN (
    SELECT ugm.user_id
    FROM user_gym_memberships ugm
    WHERE ugm.gym_id = get_user_gym_id(auth.uid()) AND ugm.status = 'active'
  ) OR 
   -- Aggiungiamo anche controllo diretto per Combat Lab
   (gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701'::uuid AND 
    auth.uid() = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'::uuid))
);

-- 4. Assicuriamoci che l'utente di Combat Lab abbia il ruolo corretto
DO $$
BEGIN
  -- Assicuriamoci che l'owner di Combat Lab abbia il ruolo gym_owner attivo
  INSERT INTO user_roles (user_id, role, is_active, granted_at)
  VALUES ('aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'::uuid, 'gym_owner'::app_role, true, now())
  ON CONFLICT (user_id, role) 
  DO UPDATE SET is_active = true, granted_at = now();
  
  -- Assicuriamoci che la membership sia attiva
  UPDATE user_gym_memberships 
  SET status = 'active', membership_type = 'owner'
  WHERE user_id = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'::uuid 
    AND gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701'::uuid;
END $$;