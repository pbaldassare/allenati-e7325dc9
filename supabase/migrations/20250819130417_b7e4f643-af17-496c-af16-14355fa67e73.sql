-- Step 1: Create equivalent gym-specific plans for existing global plans
-- First, let's see what gyms exist and create custom plans for each

-- Create custom plans for each gym based on existing global plans
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

-- Step 2: Migrate existing user subscriptions from global plans to gym-specific plans
-- For each user subscription on a global plan, find the equivalent gym plan and migrate
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
);

-- Step 3: Update RLS policies to hide global plans
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

-- Step 4: Remove global plans (after migration is complete)
DELETE FROM public.subscription_plans WHERE gym_id IS NULL;