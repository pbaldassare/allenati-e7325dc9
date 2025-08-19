-- Step 1: Create gym-specific plans for each active gym based on existing global plans
INSERT INTO public.subscription_plans (name, price, duration_days, credits_included, unlimited_access, is_trial, is_active, gym_id)
SELECT 
  sp.name || ' - ' || g.name as name,
  sp.price,
  sp.duration_days, 
  sp.credits_included,
  sp.unlimited_access,
  sp.is_trial,
  sp.is_active,
  g.id as gym_id
FROM public.subscription_plans sp
CROSS JOIN public.gyms g
WHERE sp.gym_id IS NULL 
  AND sp.is_active = true
  AND g.is_active = true
ON CONFLICT DO NOTHING;

-- Step 2: Update ALL subscriptions that reference global plans
-- For subscriptions that can be mapped, migrate them to the equivalent gym plan
UPDATE public.user_subscriptions 
SET plan_id = (
  SELECT new_sp.id 
  FROM public.subscription_plans new_sp
  JOIN public.subscription_plans old_sp ON old_sp.id = user_subscriptions.plan_id
  WHERE new_sp.gym_id = user_subscriptions.gym_id
    AND new_sp.name LIKE old_sp.name || ' - %'
    AND new_sp.price = old_sp.price
    AND new_sp.duration_days = old_sp.duration_days
    AND new_sp.credits_included = old_sp.credits_included
  LIMIT 1
)
WHERE plan_id IN (
  SELECT id FROM public.subscription_plans WHERE gym_id IS NULL
)
AND EXISTS (
  SELECT 1 
  FROM public.subscription_plans new_sp
  JOIN public.subscription_plans old_sp ON old_sp.id = user_subscriptions.plan_id
  WHERE new_sp.gym_id = user_subscriptions.gym_id
    AND new_sp.name LIKE old_sp.name || ' - %'
    AND new_sp.price = old_sp.price
    AND new_sp.duration_days = old_sp.duration_days
    AND new_sp.credits_included = old_sp.credits_included
);

-- Step 3: For subscriptions that cannot be mapped (orphaned), cancel them
UPDATE public.user_subscriptions 
SET status = 'cancelled', 
    expires_at = now()
WHERE plan_id IN (
  SELECT id FROM public.subscription_plans WHERE gym_id IS NULL
)
AND NOT EXISTS (
  SELECT 1 
  FROM public.subscription_plans new_sp
  JOIN public.subscription_plans old_sp ON old_sp.id = user_subscriptions.plan_id
  WHERE new_sp.gym_id = user_subscriptions.gym_id
    AND new_sp.name LIKE old_sp.name || ' - %'
    AND new_sp.price = old_sp.price
    AND new_sp.duration_days = old_sp.duration_days
    AND new_sp.credits_included = old_sp.credits_included
);

-- Step 4: Check if there are still any references to global plans before deletion
-- If there are, we need to create a default plan for those users
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count 
    FROM public.user_subscriptions 
    WHERE plan_id IN (SELECT id FROM public.subscription_plans WHERE gym_id IS NULL);
    
    IF orphaned_count > 0 THEN
        -- Create a default plan for each gym to handle orphaned subscriptions
        INSERT INTO public.subscription_plans (name, price, duration_days, credits_included, unlimited_access, is_trial, is_active, gym_id)
        SELECT 
          'Piano Base - ' || g.name as name,
          9.99,
          30, 
          10,
          false,
          false,
          true,
          g.id as gym_id
        FROM public.gyms g
        WHERE g.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM public.subscription_plans sp 
          WHERE sp.gym_id = g.id AND sp.name LIKE 'Piano Base - %'
        );
        
        -- Migrate remaining orphaned subscriptions to these default plans
        UPDATE public.user_subscriptions 
        SET plan_id = (
          SELECT sp.id 
          FROM public.subscription_plans sp
          WHERE sp.gym_id = user_subscriptions.gym_id
            AND sp.name LIKE 'Piano Base - %'
          LIMIT 1
        )
        WHERE plan_id IN (
          SELECT id FROM public.subscription_plans WHERE gym_id IS NULL
        );
    END IF;
END $$;

-- Step 5: Update RLS policies to hide global plans
DROP POLICY IF EXISTS "Users can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Users can view gym subscription plans" ON public.subscription_plans
  FOR SELECT 
  USING (
    is_active = true 
    AND gym_id IS NOT NULL
    AND gym_id IN (
      SELECT gym_id 
      FROM public.user_gym_memberships 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
  );

-- Step 6: Add policy for gym owners to manage their subscription plans
CREATE POLICY "Gym owners can manage their subscription plans" ON public.subscription_plans
  FOR ALL
  USING (
    has_role(auth.uid(), 'gym_owner'::app_role) 
    AND gym_id = get_user_gym_id(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'gym_owner'::app_role) 
    AND gym_id = get_user_gym_id(auth.uid())
  );

-- Step 7: Add admin policy for managing all plans
CREATE POLICY "Admins can manage all subscription plans" ON public.subscription_plans
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Step 8: Now safely remove global plans
DELETE FROM public.subscription_plans WHERE gym_id IS NULL;