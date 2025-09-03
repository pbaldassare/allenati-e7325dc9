-- Step 1: Deactivate the older duplicate subscription for Giulia Alessi
-- Keep the newer one (created at 18:07:24) and deactivate the older one (created at 13:02:32)
UPDATE public.user_subscriptions 
SET status = 'cancelled',
    updated_at = now()
WHERE id = '5951a57b-a97e-4598-a552-ac425ed3cb7f'
  AND user_id = (SELECT user_id FROM profiles WHERE email = 'giulia.alessi2499@gmail.com')
  AND status = 'active';

-- Step 2: Add a unique constraint to prevent future duplicate active subscriptions
-- This ensures only one active subscription per user per plan
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT unique_active_subscription_per_user_plan 
UNIQUE (user_id, plan_id, gym_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Step 3: Create a function to automatically cancel existing active subscriptions when creating a new one
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

-- Step 4: Create trigger to automatically prevent duplicates
CREATE TRIGGER prevent_duplicate_subscriptions_trigger
  BEFORE INSERT ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_active_subscriptions();

-- Step 5: Audit for other potential duplicates
-- This query will help identify any other users with duplicate active subscriptions
-- (Run this as a check, but don't automatically fix - needs manual review)
-- SELECT user_id, plan_id, gym_id, COUNT(*) as duplicate_count
-- FROM public.user_subscriptions 
-- WHERE status = 'active'
-- GROUP BY user_id, plan_id, gym_id
-- HAVING COUNT(*) > 1;