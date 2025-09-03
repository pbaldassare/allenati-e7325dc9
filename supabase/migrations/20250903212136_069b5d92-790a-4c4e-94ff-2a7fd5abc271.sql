-- Step 1: Deactivate the older duplicate subscription for Giulia Alessi specifically
UPDATE public.user_subscriptions 
SET status = 'cancelled',
    updated_at = now()
WHERE id = '5951a57b-a97e-4598-a552-ac425ed3cb7f';

-- Step 2: Fix Alessandro Bracaglia's duplicate (keep the newer one)
UPDATE public.user_subscriptions 
SET status = 'cancelled',
    updated_at = now()
WHERE id = 'a78b79b3-1891-4753-b9d0-dcbac233713b'; -- older one from 2025-09-01

-- Step 3: Fix other user's duplicates by keeping only the newest subscription for each user/plan/gym combo
WITH duplicate_subscriptions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, plan_id, gym_id 
      ORDER BY created_at DESC
    ) as rn
  FROM public.user_subscriptions
  WHERE status = 'active'
)
UPDATE public.user_subscriptions 
SET status = 'cancelled',
    updated_at = now()
WHERE id IN (
  SELECT id 
  FROM duplicate_subscriptions 
  WHERE rn > 1
);

-- Step 4: Now add the unique constraint to prevent future duplicates
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT unique_active_subscription_per_user_plan 
UNIQUE (user_id, plan_id, gym_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Step 5: Create a function to automatically cancel existing active subscriptions when creating a new one
CREATE OR REPLACE FUNCTION prevent_duplicate_active_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply this logic for active subscriptions
  IF NEW.status = 'active' THEN
    -- Cancel any existing active subscriptions for the same user, plan, and gym
    UPDATE public.user_subscriptions 
    SET status = 'cancelled',
        updated_at = now()
    WHERE user_id = NEW.user_id 
      AND plan_id = NEW.plan_id 
      AND gym_id = NEW.gym_id
      AND status = 'active'
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to automatically prevent duplicates
CREATE TRIGGER prevent_duplicate_subscriptions_trigger
  BEFORE INSERT ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_active_subscriptions();