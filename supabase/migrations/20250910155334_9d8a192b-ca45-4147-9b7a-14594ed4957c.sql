-- CORREZIONE COMPLETA PER PAOLO - SUPER ISTRUTTORE

-- Fase 1: Correzione immediata dei dati di Paolo
-- Aggiorna i privilegi di Paolo nella tabella instructors per sincronizzare con instructor_gym_assignments
UPDATE public.instructors 
SET has_owner_privileges = true
WHERE user_id = (
  SELECT au.id 
  FROM auth.users au 
  WHERE au.email = 'kato.aifp@gmail.com'
);

-- Verifica e corregge la membership di Paolo se necessario
INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
SELECT 
  au.id,
  iga.gym_id,
  'member',
  'active'
FROM auth.users au
JOIN public.instructors i ON i.user_id = au.id
JOIN public.instructor_gym_assignments iga ON iga.instructor_id = i.id
WHERE au.email = 'kato.aifp@gmail.com'
  AND iga.is_active = true
ON CONFLICT (user_id, gym_id) DO UPDATE SET
  status = 'active';

-- Fase 2: Correzione dei trigger di sincronizzazione
-- Drop dei trigger esistenti per ricrearli correttamente
DROP TRIGGER IF EXISTS sync_instructor_privileges_assignments ON public.instructor_gym_assignments;
DROP TRIGGER IF EXISTS sync_instructor_privileges_instructors ON public.instructors;

-- Ricrea la funzione di sincronizzazione migliorata
CREATE OR REPLACE FUNCTION public.sync_instructor_owner_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Quando instructor_gym_assignments cambia, sincronizza con instructors
  IF TG_TABLE_NAME = 'instructor_gym_assignments' THEN
    UPDATE public.instructors 
    SET has_owner_privileges = NEW.has_owner_privileges,
        updated_at = now()
    WHERE id = NEW.instructor_id;
    
    -- Log per debug
    RAISE LOG 'Synced instructor privileges from assignments: instructor_id=%, privileges=%', 
      NEW.instructor_id, NEW.has_owner_privileges;
    
    RETURN NEW;
  END IF;
  
  -- Quando instructors cambia, sincronizza con instructor_gym_assignments
  IF TG_TABLE_NAME = 'instructors' THEN
    UPDATE public.instructor_gym_assignments 
    SET has_owner_privileges = NEW.has_owner_privileges,
        updated_at = now()
    WHERE instructor_id = NEW.id AND is_active = true;
    
    -- Log per debug
    RAISE LOG 'Synced instructor privileges from instructors: instructor_id=%, privileges=%', 
      NEW.id, NEW.has_owner_privileges;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ricrea i trigger
CREATE TRIGGER sync_instructor_privileges_assignments
  AFTER UPDATE OF has_owner_privileges ON public.instructor_gym_assignments
  FOR EACH ROW
  WHEN (OLD.has_owner_privileges IS DISTINCT FROM NEW.has_owner_privileges)
  EXECUTE FUNCTION public.sync_instructor_owner_privileges();

CREATE TRIGGER sync_instructor_privileges_instructors
  AFTER UPDATE OF has_owner_privileges ON public.instructors
  FOR EACH ROW
  WHEN (OLD.has_owner_privileges IS DISTINCT FROM NEW.has_owner_privileges)
  EXECUTE FUNCTION public.sync_instructor_owner_privileges();

-- Fase 3: Miglioramento delle funzioni di promozione
-- Aggiorna promote_instructor_to_super per sincronizzare entrambe le tabelle
CREATE OR REPLACE FUNCTION public.promote_instructor_to_super(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _actor_is_admin boolean;
  _actor_is_owner boolean;
  _actor_owned_gyms uuid[];
  _target_gym_id uuid;
  _instructor_id uuid;
BEGIN
  -- Check if actor is admin or gym owner
  SELECT has_role(COALESCE(_actor, _user_id), 'admin'::app_role) INTO _actor_is_admin;
  SELECT has_role(COALESCE(_actor, _user_id), 'gym_owner'::app_role) INTO _actor_is_owner;

  IF NOT (_actor_is_admin OR _actor_is_owner) THEN
    RAISE EXCEPTION 'Permission denied: Only admins or gym owners can promote instructors';
  END IF;

  -- Get target user's gym
  SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
  IF _target_gym_id IS NULL THEN
    RAISE EXCEPTION 'Target user has no gym';
  END IF;

  -- If admin, allow promotion; if owner, check if target gym is owned by actor
  IF _actor_is_admin THEN
    -- Admin can promote instructors in any gym
    NULL;
  ELSE
    -- Gym owner path - check if target gym is in owned gyms
    SELECT get_user_owned_gyms(COALESCE(_actor, _user_id)) INTO _actor_owned_gyms;
    IF _actor_owned_gyms IS NULL OR NOT (_target_gym_id = ANY(_actor_owned_gyms)) THEN
      RAISE EXCEPTION 'Permission denied: Instructor not in your owned gyms';
    END IF;
  END IF;

  -- Get instructor_id
  SELECT id INTO _instructor_id
  FROM public.instructors 
  WHERE user_id = _user_id AND gym_id = _target_gym_id AND is_active = true;

  IF _instructor_id IS NULL THEN
    RAISE EXCEPTION 'Instructor not found';
  END IF;

  -- Aggiorna ENTRAMBE le tabelle in una transazione atomica
  -- Prima aggiorna instructors (trigger aggiornerà assignments)
  UPDATE public.instructors 
  SET has_owner_privileges = true,
      updated_at = now()
  WHERE id = _instructor_id;

  -- Assicurati che l'assignment esista e sia attivo
  INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, is_active)
  VALUES (_instructor_id, _target_gym_id, true, true)
  ON CONFLICT (instructor_id, gym_id) DO UPDATE SET
    has_owner_privileges = true,
    is_active = true,
    updated_at = now();

  RAISE LOG 'Promoted instructor to super: user_id=%, instructor_id=%, gym_id=%', 
    _user_id, _instructor_id, _target_gym_id;

  RETURN true;
END;
$function$;

-- Aggiorna demote_super_instructor per sincronizzare entrambe le tabelle
CREATE OR REPLACE FUNCTION public.demote_super_instructor(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _actor uuid := auth.uid();
  _actor_is_admin boolean;
  _actor_is_owner boolean;
  _actor_owned_gyms uuid[];
  _target_gym_id uuid;
  _instructor_id uuid;
  _is_gym_owner boolean;
BEGIN
  -- Check if actor is admin or gym owner
  SELECT has_role(COALESCE(_actor, _user_id), 'admin'::app_role) INTO _actor_is_admin;
  SELECT has_role(COALESCE(_actor, _user_id), 'gym_owner'::app_role) INTO _actor_is_owner;

  IF NOT (_actor_is_admin OR _actor_is_owner) THEN
    RAISE EXCEPTION 'Permission denied: Only admins or gym owners can demote instructors';
  END IF;

  -- Get target user's gym
  SELECT get_user_gym_id(_user_id) INTO _target_gym_id;
  IF _target_gym_id IS NULL THEN
    RAISE EXCEPTION 'Target user has no gym';
  END IF;

  -- If admin, allow demotion; if owner, check if target gym is owned by actor
  IF _actor_is_admin THEN
    -- Admin can demote instructors in any gym
    NULL;
  ELSE
    -- Gym owner path - check if target gym is in owned gyms
    SELECT get_user_owned_gyms(COALESCE(_actor, _user_id)) INTO _actor_owned_gyms;
    IF _actor_owned_gyms IS NULL OR NOT (_target_gym_id = ANY(_actor_owned_gyms)) THEN
      RAISE EXCEPTION 'Permission denied: Instructor not in your owned gyms';
    END IF;
  END IF;

  -- Get instructor_id
  SELECT id INTO _instructor_id
  FROM public.instructors 
  WHERE user_id = _user_id AND gym_id = _target_gym_id AND is_active = true;

  IF _instructor_id IS NULL THEN
    RAISE EXCEPTION 'Instructor not found';
  END IF;

  -- Verifica se l'utente è proprietario della palestra
  SELECT EXISTS (
    SELECT 1 FROM public.user_gym_memberships ugm
    WHERE ugm.user_id = _user_id 
      AND ugm.gym_id = _target_gym_id
      AND ugm.membership_type = 'owner'
      AND ugm.status = 'active'
  ) INTO _is_gym_owner;

  -- Se è proprietario, mantieni i privilegi, altrimenti rimuovili
  -- Prima aggiorna instructors (trigger aggiornerà assignments)
  UPDATE public.instructors 
  SET has_owner_privileges = _is_gym_owner,
      updated_at = now()
  WHERE id = _instructor_id;

  -- Assicurati che l'assignment sia sincronizzato
  UPDATE public.instructor_gym_assignments 
  SET has_owner_privileges = _is_gym_owner,
      is_active = true,
      updated_at = now()
  WHERE instructor_id = _instructor_id AND gym_id = _target_gym_id;

  RAISE LOG 'Demoted super instructor: user_id=%, instructor_id=%, gym_id=%, kept_privileges=%', 
    _user_id, _instructor_id, _target_gym_id, _is_gym_owner;

  RETURN true;
END;
$function$;

-- Fase 4: Controlli di integrità per prevenire inconsistenze future
-- Funzione di controllo integrità per rilevare e correggere inconsistenze
CREATE OR REPLACE FUNCTION public.fix_instructor_privilege_inconsistencies()
RETURNS TABLE(fixed_user_id uuid, instructor_id uuid, gym_id uuid, action_taken text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  inconsistent_record RECORD;
BEGIN
  -- Trova e corregge inconsistenze
  FOR inconsistent_record IN 
    SELECT 
      i.user_id,
      i.id as instructor_id,
      iga.gym_id,
      i.has_owner_privileges as instructor_privileges,
      iga.has_owner_privileges as assignment_privileges
    FROM public.instructors i
    JOIN public.instructor_gym_assignments iga ON i.id = iga.instructor_id
    WHERE i.is_active = true 
      AND iga.is_active = true
      AND i.has_owner_privileges != iga.has_owner_privileges
  LOOP
    -- Correggi usando il valore dell'assignment come source of truth
    UPDATE public.instructors 
    SET has_owner_privileges = inconsistent_record.assignment_privileges,
        updated_at = now()
    WHERE id = inconsistent_record.instructor_id;
    
    -- Restituisci informazioni sulla correzione
    fixed_user_id := inconsistent_record.user_id;
    instructor_id := inconsistent_record.instructor_id;
    gym_id := inconsistent_record.gym_id;
    action_taken := 'Fixed instructor privileges from ' || 
                   inconsistent_record.instructor_privileges || ' to ' || 
                   inconsistent_record.assignment_privileges;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$function$;

-- Applica le correzioni di integrità
SELECT * FROM public.fix_instructor_privilege_inconsistencies();

-- Verifica finale: controlla lo stato di Paolo dopo le correzioni
SELECT 
  au.email,
  i.has_owner_privileges as instructor_privileges,
  iga.has_owner_privileges as assignment_privileges,
  ugm.membership_type,
  ugm.status as membership_status,
  g.name as gym_name
FROM auth.users au
JOIN public.instructors i ON i.user_id = au.id
JOIN public.instructor_gym_assignments iga ON iga.instructor_id = i.id
JOIN public.gyms g ON g.id = iga.gym_id
JOIN public.user_gym_memberships ugm ON ugm.user_id = au.id AND ugm.gym_id = g.id
WHERE au.email = 'kato.aifp@gmail.com'
  AND i.is_active = true 
  AND iga.is_active = true;