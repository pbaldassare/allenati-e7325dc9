-- Update get_user_gym_id function to support regular users with memberships
CREATE OR REPLACE FUNCTION public.get_user_gym_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(
    -- First check user_gym_memberships for regular users
    (SELECT gym_id
     FROM public.user_gym_memberships
     WHERE user_id = _user_id 
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1),
    -- Fallback to instructors table for instructor users
    (SELECT gym_id
     FROM public.instructors
     WHERE user_id = _user_id
     LIMIT 1)
  )
$function$;