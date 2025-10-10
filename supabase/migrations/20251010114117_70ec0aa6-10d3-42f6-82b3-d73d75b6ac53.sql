-- Drop existing policy that blocks refunds
DROP POLICY IF EXISTS "Gym owners and super instructors can manage credit transactions" ON public.credits_transactions;

-- 1. Policy for SELECT - view credit transactions
CREATE POLICY "Gym owners and super instructors can view credit transactions"
ON public.credits_transactions 
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() = user_id) 
  OR (has_role(auth.uid(), 'gym_owner'::app_role) AND 
      user_id IN (
        SELECT ugm.user_id
        FROM user_gym_memberships ugm
        WHERE ugm.gym_id = ANY(get_user_owned_gyms(auth.uid())) 
          AND ugm.status = 'active'
      )
  )
  OR (has_role(auth.uid(), 'instructor'::app_role) AND 
      gym_id IN (
        SELECT iga.gym_id
        FROM instructor_gym_assignments iga
        JOIN instructors i ON iga.instructor_id = i.id
        WHERE i.user_id = auth.uid() 
          AND iga.has_owner_privileges = true 
          AND iga.is_active = true
      )
  )
);

-- 2. Policy for INSERT - create credit transactions (including refunds)
CREATE POLICY "Staff can create credit transactions for gym members"
ON public.credits_transactions 
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = user_id)
  OR (
    -- Gym owners can create transactions for their gym members (includes refunds)
    has_role(auth.uid(), 'gym_owner'::app_role) 
    AND gym_id = ANY(get_user_owned_gyms(auth.uid()))
    AND user_id IN (
      SELECT ugm.user_id
      FROM user_gym_memberships ugm
      WHERE ugm.gym_id = credits_transactions.gym_id
        AND ugm.status = 'active'
    )
  )
  OR (
    -- Super instructors can create transactions for their gym members
    has_role(auth.uid(), 'instructor'::app_role)
    AND gym_id IN (
      SELECT iga.gym_id
      FROM instructor_gym_assignments iga
      JOIN instructors i ON iga.instructor_id = i.id
      WHERE i.user_id = auth.uid() 
        AND iga.has_owner_privileges = true 
        AND iga.is_active = true
    )
    AND user_id IN (
      SELECT ugm.user_id
      FROM user_gym_memberships ugm
      WHERE ugm.gym_id = credits_transactions.gym_id
        AND ugm.status = 'active'
    )
  )
);

-- 3. Policy for UPDATE - only admins can update
CREATE POLICY "Only admins can update credit transactions"
ON public.credits_transactions 
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Policy for DELETE - only admins can delete
CREATE POLICY "Only admins can delete credit transactions"
ON public.credits_transactions 
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));