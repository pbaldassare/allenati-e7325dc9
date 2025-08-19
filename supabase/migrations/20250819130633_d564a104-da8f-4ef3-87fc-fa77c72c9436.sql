-- Step 1: First, let's temporarily make plan_id nullable to handle the migration
ALTER TABLE public.user_subscriptions ALTER COLUMN plan_id DROP NOT NULL;

-- Step 2: Create gym-specific plans for each active gym based on existing global plans
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

-- Step 3: Migrate subscriptions that can be mapped to equivalent gym plans
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

-- Step 4: Create default plans for any remaining orphaned subscriptions
INSERT INTO public.subscription_plans (name, price, duration_days, credits_included, unlimited_access, is_trial, is_active, gym_id)
SELECT DISTINCT
  'Piano Base - ' || g.name as name,
  9.99,
  30, 
  10,
  false,
  false,
  true,
  g.id as gym_id
FROM public.gyms g
JOIN public.user_subscriptions us ON us.gym_id = g.id
WHERE us.plan_id IN (SELECT id FROM public.subscription_plans WHERE gym_id IS NULL)
  AND g.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.subscription_plans sp 
    WHERE sp.gym_id = g.id AND sp.name LIKE 'Piano Base - %'
  );

-- Step 5: Map remaining orphaned subscriptions to default plans
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

-- Step 6: Delete any remaining subscriptions that still can't be mapped (set them as cancelled first)
UPDATE public.user_subscriptions 
SET status = 'cancelled', 
    expires_at = now(),
    plan_id = NULL
WHERE plan_id IN (
  SELECT id FROM public.subscription_plans WHERE gym_id IS NULL
);

-- Step 7: Now we can safely delete global plans
DELETE FROM public.subscription_plans WHERE gym_id IS NULL;

-- Step 8: Clean up any subscriptions with NULL plan_id
DELETE FROM public.user_subscriptions WHERE plan_id IS NULL;

-- Step 9: Restore the NOT NULL constraint
ALTER TABLE public.user_subscriptions ALTER COLUMN plan_id SET NOT NULL;

-- Step 10: Update RLS policies to only show gym-specific plans
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

-- Step 11: Add policy for gym owners to manage their subscription plans
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

-- Step 12: Add admin policy for managing all plans
CREATE POLICY "Admins can manage all subscription plans" ON public.subscription_plans
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));