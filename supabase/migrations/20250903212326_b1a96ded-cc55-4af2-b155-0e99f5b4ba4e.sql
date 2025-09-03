-- Create a partial unique constraint that only applies to active subscriptions
-- This allows multiple cancelled/expired subscriptions but only one active per user/plan/gym
CREATE UNIQUE INDEX unique_active_subscription_per_user_plan 
ON public.user_subscriptions (user_id, plan_id, gym_id) 
WHERE status = 'active';

-- Create a function to automatically cancel existing active subscriptions when creating a new one
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically prevent duplicates
CREATE TRIGGER prevent_duplicate_subscriptions_trigger
  BEFORE INSERT ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_active_subscriptions();