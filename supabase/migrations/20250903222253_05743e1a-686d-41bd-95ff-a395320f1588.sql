-- Create instructor gym assignments table for multi-gym support
CREATE TABLE public.instructor_gym_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_id UUID NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  has_owner_privileges BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(instructor_id, gym_id)
);

-- Enable RLS
ALTER TABLE public.instructor_gym_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for instructor gym assignments
CREATE POLICY "Admins can manage all instructor gym assignments"
ON public.instructor_gym_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gym owners can manage their gym instructor assignments"
ON public.instructor_gym_assignments
FOR ALL
USING (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = get_user_gym_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role) 
  AND gym_id = get_user_gym_id(auth.uid())
);

CREATE POLICY "Instructors can view their own assignments"
ON public.instructor_gym_assignments
FOR SELECT
USING (
  instructor_id IN (
    SELECT id FROM public.instructors 
    WHERE user_id = auth.uid()
  )
);

-- Function to get instructor's assigned gyms
CREATE OR REPLACE FUNCTION public.get_instructor_gyms(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(DISTINCT iga.gym_id)
  FROM public.instructor_gym_assignments iga
  JOIN public.instructors i ON iga.instructor_id = i.id
  WHERE i.user_id = _user_id 
    AND iga.is_active = true
    AND i.is_active = true
$$;

-- Function to check if instructor has owner privileges for a specific gym
CREATE OR REPLACE FUNCTION public.instructor_has_owner_privileges_for_gym(_user_id uuid, _gym_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.instructor_gym_assignments iga
    JOIN public.instructors i ON iga.instructor_id = i.id
    WHERE i.user_id = _user_id
      AND iga.gym_id = _gym_id
      AND iga.has_owner_privileges = true
      AND iga.is_active = true
      AND i.is_active = true
  )
$$;

-- Function to get instructor ID for a user in a specific gym
CREATE OR REPLACE FUNCTION public.get_instructor_id_for_gym(_user_id uuid, _gym_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT i.id
  FROM public.instructors i
  JOIN public.instructor_gym_assignments iga ON i.id = iga.instructor_id
  WHERE i.user_id = _user_id
    AND iga.gym_id = _gym_id
    AND iga.is_active = true
    AND i.is_active = true
  LIMIT 1
$$;

-- Migrate existing instructors to the new system
INSERT INTO public.instructor_gym_assignments (instructor_id, gym_id, has_owner_privileges, assigned_by)
SELECT 
  i.id,
  i.gym_id,
  i.has_owner_privileges,
  i.user_id
FROM public.instructors i
WHERE i.gym_id IS NOT NULL
  AND i.is_active = true
ON CONFLICT (instructor_id, gym_id) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_instructor_gym_assignments_updated_at
BEFORE UPDATE ON public.instructor_gym_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();