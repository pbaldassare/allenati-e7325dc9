-- Fix search path for the new functions
ALTER FUNCTION public.instructor_has_owner_privileges(_user_id uuid) SET search_path = public;
ALTER FUNCTION public.promote_instructor_to_super(_user_id uuid) SET search_path = public;
ALTER FUNCTION public.demote_super_instructor(_user_id uuid) SET search_path = public;