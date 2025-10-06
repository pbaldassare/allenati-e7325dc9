-- Remove unique constraint to allow multiple active subscriptions
-- This enables users to have multiple active subscriptions for the same plan
-- (e.g., when renewing early or purchasing multiple subscriptions)

DROP INDEX IF EXISTS public.unique_active_subscription_per_user_plan;

-- Add comment explaining the change
COMMENT ON TABLE public.user_subscriptions IS 
'Supports multiple active subscriptions per user per plan per gym. Users can have multiple active subscriptions simultaneously, allowing for early renewals and multi-subscription purchases.';