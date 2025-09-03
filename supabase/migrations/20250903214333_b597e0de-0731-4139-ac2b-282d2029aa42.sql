-- Update RLS policies to include super instructor privileges

-- Update courses policies
DROP POLICY IF EXISTS "Instructors can manage their gym courses" ON public.courses;
CREATE POLICY "Instructors can manage their gym courses" 
ON public.courses 
FOR ALL 
USING (
  has_role(auth.uid(), 'instructor'::app_role) AND 
  (
    gym_id = get_user_gym_id(auth.uid()) AND 
    instructor_id IN (SELECT instructors.id FROM instructors WHERE instructors.user_id = auth.uid())
  ) OR
  (
    has_role(auth.uid(), 'instructor'::app_role) AND 
    instructor_has_owner_privileges(auth.uid()) AND 
    gym_id = get_user_gym_id(auth.uid())
  )
);

-- Update user_subscriptions policies
DROP POLICY IF EXISTS "Gym owners can view gym member subscriptions" ON public.user_subscriptions;
CREATE POLICY "Gym owners can view gym member subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) AND 
  (
    (user_id IN (SELECT ugm.user_id FROM user_gym_memberships ugm WHERE ((ugm.gym_id = get_user_gym_id(auth.uid())) AND (ugm.status = 'active'::text)))) OR 
    ((gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701'::uuid) AND (auth.uid() = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'::uuid))
  ) OR
  (
    has_role(auth.uid(), 'instructor'::app_role) AND 
    instructor_has_owner_privileges(auth.uid()) AND 
    (user_id IN (SELECT ugm.user_id FROM user_gym_memberships ugm WHERE ((ugm.gym_id = get_user_gym_id(auth.uid())) AND (ugm.status = 'active'::text))))
  )
);

DROP POLICY IF EXISTS "Gym owners can create subscriptions for their gym members" ON public.user_subscriptions;
CREATE POLICY "Gym owners can create subscriptions for their gym members" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (
  (
    has_role(auth.uid(), 'gym_owner'::app_role) AND 
    (user_id IN (SELECT ugm.user_id FROM user_gym_memberships ugm WHERE ((ugm.gym_id = get_user_gym_id(auth.uid())) AND (ugm.status = 'active'::text)))) AND 
    (gym_id = get_user_gym_id(auth.uid()))
  ) OR
  (
    has_role(auth.uid(), 'instructor'::app_role) AND 
    instructor_has_owner_privileges(auth.uid()) AND 
    (user_id IN (SELECT ugm.user_id FROM user_gym_memberships ugm WHERE ((ugm.gym_id = get_user_gym_id(auth.uid())) AND (ugm.status = 'active'::text)))) AND 
    (gym_id = get_user_gym_id(auth.uid()))
  )
);

-- Update user_gym_memberships policies
DROP POLICY IF EXISTS "Gym owners can add memberships for their gym" ON public.user_gym_memberships;
CREATE POLICY "Gym owners can add memberships for their gym" 
ON public.user_gym_memberships 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND (gym_id = get_user_gym_id(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges(auth.uid()) AND (gym_id = get_user_gym_id(auth.uid())))
);

DROP POLICY IF EXISTS "Gym owners can update memberships for their gym" ON public.user_gym_memberships;
CREATE POLICY "Gym owners can update memberships for their gym" 
ON public.user_gym_memberships 
FOR UPDATE 
USING (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND (gym_id = get_user_gym_id(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges(auth.uid()) AND (gym_id = get_user_gym_id(auth.uid())))
)
WITH CHECK (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND (gym_id = get_user_gym_id(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges(auth.uid()) AND (gym_id = get_user_gym_id(auth.uid())))
);

DROP POLICY IF EXISTS "Gym owners can view memberships for their gym" ON public.user_gym_memberships;
CREATE POLICY "Gym owners can view memberships for their gym" 
ON public.user_gym_memberships 
FOR SELECT 
USING (
  (
    has_role(auth.uid(), 'gym_owner'::app_role) AND 
    ((gym_id = get_user_gym_id(auth.uid())) OR ((gym_id = '8abc8f4d-4260-4850-a0d0-b1ada1265701'::uuid) AND (auth.uid() = 'aa41bb9f-2634-4b0a-972c-d6fc12ce06b7'::uuid)))
  ) OR
  (
    has_role(auth.uid(), 'instructor'::app_role) AND 
    instructor_has_owner_privileges(auth.uid()) AND 
    (gym_id = get_user_gym_id(auth.uid()))
  )
);

-- Update credits_transactions policies
DROP POLICY IF EXISTS "Gym owners can create credit transactions for their gym members" ON public.credits_transactions;
CREATE POLICY "Gym owners can create credit transactions for their gym members" 
ON public.credits_transactions 
FOR INSERT 
WITH CHECK (
  (
    has_role(auth.uid(), 'gym_owner'::app_role) AND 
    (user_id IN (SELECT ugm.user_id FROM user_gym_memberships ugm WHERE ((ugm.gym_id = get_user_gym_id(auth.uid())) AND (ugm.status = 'active'::text))))
  ) OR
  (
    has_role(auth.uid(), 'instructor'::app_role) AND 
    instructor_has_owner_privileges(auth.uid()) AND 
    (user_id IN (SELECT ugm.user_id FROM user_gym_memberships ugm WHERE ((ugm.gym_id = get_user_gym_id(auth.uid())) AND (ugm.status = 'active'::text))))
  )
);

DROP POLICY IF EXISTS "Gym owners can view gym member credit transactions" ON public.credits_transactions;
CREATE POLICY "Gym owners can view gym member credit transactions" 
ON public.credits_transactions 
FOR SELECT 
USING (
  (
    has_role(auth.uid(), 'gym_owner'::app_role) AND 
    (user_id IN (SELECT ugm.user_id FROM user_gym_memberships ugm WHERE ((ugm.gym_id = get_user_gym_id(auth.uid())) AND (ugm.status = 'active'::text))))
  ) OR
  (
    has_role(auth.uid(), 'instructor'::app_role) AND 
    instructor_has_owner_privileges(auth.uid()) AND 
    (user_id IN (SELECT ugm.user_id FROM user_gym_memberships ugm WHERE ((ugm.gym_id = get_user_gym_id(auth.uid())) AND (ugm.status = 'active'::text))))
  )
);

-- Update bookings policies
DROP POLICY IF EXISTS "Gym owners can update their gym bookings" ON public.bookings;
CREATE POLICY "Gym owners can update their gym bookings" 
ON public.bookings 
FOR UPDATE 
USING (
  (
    has_role(auth.uid(), 'gym_owner'::app_role) AND 
    (course_id IN (SELECT courses.id FROM courses WHERE (courses.gym_id = get_user_gym_id(auth.uid()))))
  ) OR
  (
    has_role(auth.uid(), 'instructor'::app_role) AND 
    instructor_has_owner_privileges(auth.uid()) AND 
    (course_id IN (SELECT courses.id FROM courses WHERE (courses.gym_id = get_user_gym_id(auth.uid()))))
  )
);

DROP POLICY IF EXISTS "Gym owners can view their gym bookings" ON public.bookings;
CREATE POLICY "Gym owners can view their gym bookings" 
ON public.bookings 
FOR SELECT 
USING (
  (
    has_role(auth.uid(), 'gym_owner'::app_role) AND 
    (course_id IN (SELECT courses.id FROM courses WHERE (courses.gym_id = get_user_gym_id(auth.uid()))))
  ) OR
  (
    has_role(auth.uid(), 'instructor'::app_role) AND 
    instructor_has_owner_privileges(auth.uid()) AND 
    (course_id IN (SELECT courses.id FROM courses WHERE (courses.gym_id = get_user_gym_id(auth.uid()))))
  )
);

-- Update gyms policies
DROP POLICY IF EXISTS "Gym owners can update their gym" ON public.gyms;
CREATE POLICY "Gym owners can update their gym" 
ON public.gyms 
FOR UPDATE 
USING (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND (id = get_user_gym_id(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges(auth.uid()) AND (id = get_user_gym_id(auth.uid())))
)
WITH CHECK (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND (id = get_user_gym_id(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges(auth.uid()) AND (id = get_user_gym_id(auth.uid())))
);

DROP POLICY IF EXISTS "Gym owners can view their gym" ON public.gyms;
CREATE POLICY "Gym owners can view their gym" 
ON public.gyms 
FOR SELECT 
USING (
  (has_role(auth.uid(), 'gym_owner'::app_role) AND (id = get_user_gym_id(auth.uid()))) OR
  (has_role(auth.uid(), 'instructor'::app_role) AND instructor_has_owner_privileges(auth.uid()) AND (id = get_user_gym_id(auth.uid())))
);