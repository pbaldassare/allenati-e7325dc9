-- Drop the trigger and function that prevents duplicate subscriptions (with CASCADE)
DROP TRIGGER IF EXISTS prevent_duplicate_subscriptions_trigger ON public.user_subscriptions CASCADE;
DROP FUNCTION IF EXISTS public.prevent_duplicate_active_subscriptions() CASCADE;

-- Add activated_at column to track when subscription was activated
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone DEFAULT now();

-- Create index for better performance on subscription queries
CREATE INDEX IF NOT EXISTS idx_user_subs_active 
ON public.user_subscriptions(user_id, gym_id, status, expires_at) 
WHERE status = 'active';

-- Create function to get all active subscriptions for a user in a gym
CREATE OR REPLACE FUNCTION public.get_user_active_subscriptions(_user_id uuid, _gym_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  plan_id uuid,
  gym_id uuid,
  status subscription_status,
  starts_at timestamp with time zone,
  expires_at timestamp with time zone,
  activated_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    plan_id,
    gym_id,
    status,
    starts_at,
    expires_at,
    activated_at,
    created_at
  FROM public.user_subscriptions
  WHERE user_subscriptions.user_id = _user_id 
    AND user_subscriptions.gym_id = _gym_id
    AND user_subscriptions.status = 'active'
    AND user_subscriptions.expires_at > now()
  ORDER BY activated_at DESC, created_at DESC
$$;