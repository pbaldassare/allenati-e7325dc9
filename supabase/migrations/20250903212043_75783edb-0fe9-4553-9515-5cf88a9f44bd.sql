-- Step 1: First, let's identify and fix all duplicate subscriptions
-- Keep the most recent subscription for each user/plan/gym combination
WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    plan_id,
    gym_id,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, plan_id, gym_id, status 
      ORDER BY created_at DESC
    ) as rn
  FROM public.user_subscriptions
  WHERE status = 'active'
),
duplicates_to_cancel AS (
  SELECT id 
  FROM ranked_subscriptions 
  WHERE rn > 1
)
UPDATE public.user_subscriptions 
SET status = 'cancelled',
    updated_at = now()
WHERE id IN (SELECT id FROM duplicates_to_cancel);

-- Step 2: Now add the unique constraint (should work after cleanup)
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT unique_active_subscription_per_user_plan 
UNIQUE (user_id, plan_id, gym_id) 
DEFERRABLE INITIALLY DEFERRED;