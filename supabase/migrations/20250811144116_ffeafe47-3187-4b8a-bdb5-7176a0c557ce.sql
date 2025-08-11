-- Fix gym owner association and instructor gym links
UPDATE public.gyms 
SET owner_email = 'palestra@gmail.com' 
WHERE name = 'Fight Club Milano';

-- Update all instructors to be associated with Fight Club Milano
UPDATE public.instructors 
SET gym_id = (SELECT id FROM public.gyms WHERE name = 'Fight Club Milano' LIMIT 1)
WHERE gym_id IS NULL;

-- Add instructor role to enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'gym_owner', 'instructor', 'basic_user');
    ELSE
        -- Add instructor to existing enum
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'instructor';
    END IF;
END $$;

-- Assign instructor role to users who are instructors
INSERT INTO public.user_roles (user_id, role)
SELECT i.user_id, 'instructor'::app_role
FROM public.instructors i
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = i.user_id AND ur.role = 'instructor'::app_role
);

-- Create RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for instructors table
DROP POLICY IF EXISTS "Instructors can view own profile" ON public.instructors;
DROP POLICY IF EXISTS "Gym owners can view their gym instructors" ON public.instructors;
DROP POLICY IF EXISTS "Admins can manage all instructors" ON public.instructors;

CREATE POLICY "Instructors can view own profile" 
ON public.instructors 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Gym owners can view their gym instructors" 
ON public.instructors 
FOR SELECT 
USING (
    has_role(auth.uid(), 'gym_owner'::app_role) 
    AND gym_id = get_user_gym_id(auth.uid())
);

CREATE POLICY "Admins can manage all instructors" 
ON public.instructors 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for gyms table
DROP POLICY IF EXISTS "Gym owners can view their gym" ON public.gyms;
DROP POLICY IF EXISTS "Admins can manage all gyms" ON public.gyms;

CREATE POLICY "Gym owners can view their gym" 
ON public.gyms 
FOR SELECT 
USING (
    has_role(auth.uid(), 'gym_owner'::app_role) 
    AND id = get_user_gym_id(auth.uid())
);

CREATE POLICY "Admins can manage all gyms" 
ON public.gyms 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for courses table
DROP POLICY IF EXISTS "Users can view active courses" ON public.courses;
DROP POLICY IF EXISTS "Instructors can manage their courses" ON public.courses;
DROP POLICY IF EXISTS "Gym owners can manage their gym courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;

CREATE POLICY "Users can view active courses" 
ON public.courses 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Instructors can manage their courses" 
ON public.courses 
FOR ALL 
USING (
    has_role(auth.uid(), 'instructor'::app_role) 
    AND instructor_id IN (
        SELECT id FROM public.instructors WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can manage their gym courses" 
ON public.courses 
FOR ALL 
USING (
    has_role(auth.uid(), 'gym_owner'::app_role) 
    AND gym_id = get_user_gym_id(auth.uid())
);

CREATE POLICY "Admins can manage all courses" 
ON public.courses 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for course_categories table
DROP POLICY IF EXISTS "Users can view active categories" ON public.course_categories;
DROP POLICY IF EXISTS "Gym owners can manage their gym categories" ON public.course_categories;
DROP POLICY IF EXISTS "Admins can manage all categories" ON public.course_categories;

CREATE POLICY "Users can view active categories" 
ON public.course_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Gym owners can manage their gym categories" 
ON public.course_categories 
FOR ALL 
USING (
    has_role(auth.uid(), 'gym_owner'::app_role) 
    AND gym_id = get_user_gym_id(auth.uid())
);

CREATE POLICY "Admins can manage all categories" 
ON public.course_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for course_schedules table
DROP POLICY IF EXISTS "Users can view active schedules" ON public.course_schedules;
DROP POLICY IF EXISTS "Instructors can manage their course schedules" ON public.course_schedules;
DROP POLICY IF EXISTS "Gym owners can manage their gym schedules" ON public.course_schedules;
DROP POLICY IF EXISTS "Admins can manage all schedules" ON public.course_schedules;

CREATE POLICY "Users can view active schedules" 
ON public.course_schedules 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Instructors can manage their course schedules" 
ON public.course_schedules 
FOR ALL 
USING (
    has_role(auth.uid(), 'instructor'::app_role) 
    AND course_id IN (
        SELECT c.id FROM public.courses c
        JOIN public.instructors i ON c.instructor_id = i.id
        WHERE i.user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can manage their gym schedules" 
ON public.course_schedules 
FOR ALL 
USING (
    has_role(auth.uid(), 'gym_owner'::app_role) 
    AND course_id IN (
        SELECT id FROM public.courses WHERE gym_id = get_user_gym_id(auth.uid())
    )
);

CREATE POLICY "Admins can manage all schedules" 
ON public.course_schedules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for bookings table
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Instructors can view their course bookings" ON public.bookings;
DROP POLICY IF EXISTS "Gym owners can view their gym bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view their course bookings" 
ON public.bookings 
FOR SELECT 
USING (
    has_role(auth.uid(), 'instructor'::app_role) 
    AND course_id IN (
        SELECT c.id FROM public.courses c
        JOIN public.instructors i ON c.instructor_id = i.id
        WHERE i.user_id = auth.uid()
    )
);

CREATE POLICY "Gym owners can view their gym bookings" 
ON public.bookings 
FOR SELECT 
USING (
    has_role(auth.uid(), 'gym_owner'::app_role) 
    AND course_id IN (
        SELECT id FROM public.courses WHERE gym_id = get_user_gym_id(auth.uid())
    )
);

CREATE POLICY "Admins can manage all bookings" 
ON public.bookings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));