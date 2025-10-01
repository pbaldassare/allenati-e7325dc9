-- Add user_id column to gym_documents table (if not exists)
ALTER TABLE public.gym_documents 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gym_documents_user_id ON public.gym_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_documents_gym_user ON public.gym_documents(gym_id, user_id);

-- Drop ALL existing RLS policies on gym_documents (comprehensive list)
DROP POLICY IF EXISTS "Users can view their own documents" ON public.gym_documents;
DROP POLICY IF EXISTS "Gym owners can view all documents in their gyms" ON public.gym_documents;
DROP POLICY IF EXISTS "Super instructors can view all documents in their gyms" ON public.gym_documents;
DROP POLICY IF EXISTS "Gym owners can manage documents for their gym users" ON public.gym_documents;
DROP POLICY IF EXISTS "Super instructors can manage documents for their gym users" ON public.gym_documents;
DROP POLICY IF EXISTS "Gym members can view their gym documents" ON public.gym_documents;
DROP POLICY IF EXISTS "Gym owners can manage their gym documents" ON public.gym_documents;
DROP POLICY IF EXISTS "Super instructors can manage gym documents" ON public.gym_documents;
DROP POLICY IF EXISTS "Admins can manage all gym documents" ON public.gym_documents;

-- Create new RLS policies for user-specific documents
CREATE POLICY "users_view_own_documents"
ON public.gym_documents
FOR SELECT
USING (
  auth.uid() = user_id
  AND is_active = true
);

CREATE POLICY "owners_view_gym_documents"
ON public.gym_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'gym_owner'::app_role)
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
  AND is_active = true
);

CREATE POLICY "super_instructors_view_documents"
ON public.gym_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'instructor'::app_role)
  AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id)
  AND is_active = true
);

CREATE POLICY "owners_manage_user_documents"
ON public.gym_documents
FOR ALL
USING (
  has_role(auth.uid(), 'gym_owner'::app_role)
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gym_owner'::app_role)
  AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
  AND user_id IN (
    SELECT user_id 
    FROM public.user_gym_memberships 
    WHERE gym_id = gym_documents.gym_id 
    AND status = 'active'
  )
);

CREATE POLICY "super_instructors_manage_documents"
ON public.gym_documents
FOR ALL
USING (
  has_role(auth.uid(), 'instructor'::app_role)
  AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id)
)
WITH CHECK (
  has_role(auth.uid(), 'instructor'::app_role)
  AND instructor_has_owner_privileges_for_gym(auth.uid(), gym_id)
  AND user_id IN (
    SELECT user_id 
    FROM public.user_gym_memberships 
    WHERE gym_id = gym_documents.gym_id 
    AND status = 'active'
  )
);

CREATE POLICY "admins_full_access"
ON public.gym_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));