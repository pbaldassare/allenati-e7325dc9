-- Fix RLS policies for multi-gym owners

-- Drop and recreate user_gym_memberships policies to support multi-gym owners
DROP POLICY IF EXISTS "Gym owners can view memberships for their gym" ON public.user_gym_memberships;
DROP POLICY IF EXISTS "Gym owners can add memberships for their gym" ON public.user_gym_memberships;
DROP POLICY IF EXISTS "Gym owners can update memberships for their gym" ON public.user_gym_memberships;

-- Create corrected policies for user_gym_memberships
CREATE POLICY "Gym owners can view memberships for their gyms" 
ON public.user_gym_memberships 
FOR SELECT 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

CREATE POLICY "Gym owners can add memberships for their gyms" 
ON public.user_gym_memberships 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

CREATE POLICY "Gym owners can update memberships for their gyms" 
ON public.user_gym_memberships 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

-- Fix instructors policies
DROP POLICY IF EXISTS "Gym owners can manage their instructors" ON public.instructors;
DROP POLICY IF EXISTS "Gym owners can view their gym instructors" ON public.instructors;

CREATE POLICY "Gym owners can manage their gym instructors" 
ON public.instructors 
FOR ALL 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

-- Fix user_subscriptions policies  
DROP POLICY IF EXISTS "Gym owners can view gym member subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Gym owners can create subscriptions for their gym members" ON public.user_subscriptions;

CREATE POLICY "Gym owners can view gym member subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

CREATE POLICY "Gym owners can create subscriptions for their gym members" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
);

-- Fix bookings policies
DROP POLICY IF EXISTS "Gym owners can view their gym bookings" ON public.bookings;
DROP POLICY IF EXISTS "Gym owners can update their gym bookings" ON public.bookings;

CREATE POLICY "Gym owners can view their gym bookings" 
ON public.bookings 
FOR SELECT 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  course_id IN (
    SELECT c.id 
    FROM courses c 
    WHERE c.gym_id = ANY(get_user_owned_gyms(auth.uid()))
  )
);

CREATE POLICY "Gym owners can update their gym bookings" 
ON public.bookings 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  course_id IN (
    SELECT c.id 
    FROM courses c 
    WHERE c.gym_id = ANY(get_user_owned_gyms(auth.uid()))
  )
);

-- Fix courses policies
DROP POLICY IF EXISTS "Gym owners can manage their gym courses" ON public.courses;

CREATE POLICY "Gym owners can manage their gym courses" 
ON public.courses 
FOR ALL 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  gym_id = ANY(get_user_owned_gyms(auth.uid()))
);