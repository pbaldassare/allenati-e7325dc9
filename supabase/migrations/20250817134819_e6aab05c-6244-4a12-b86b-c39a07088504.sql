-- STEP 1: DATABASE MODIFICATIONS FOR MULTI-GYM SYSTEM

-- 1. CREATE gym_credits table to replace profiles.current_credits
CREATE TABLE public.gym_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, gym_id)
);

-- Enable RLS on gym_credits
ALTER TABLE public.gym_credits ENABLE ROW LEVEL SECURITY;

-- Create policies for gym_credits
CREATE POLICY "Users can view their own gym credits" 
ON public.gym_credits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gym credits" 
ON public.gym_credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gym credits" 
ON public.gym_credits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Gym owners can view their gym member credits" 
ON public.gym_credits 
FOR SELECT 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = get_user_gym_id(auth.uid()));

CREATE POLICY "Gym owners can update their gym member credits" 
ON public.gym_credits 
FOR ALL
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = get_user_gym_id(auth.uid()));

-- 2. ADD gym_id to user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

-- Update RLS policies for user_subscriptions to include gym filtering
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Gym owners can view gym member subscriptions" ON public.user_subscriptions;

CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gym owners can view their gym member subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = get_user_gym_id(auth.uid()));

-- 3. ADD gym_id to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

-- Update RLS policies for subscription_plans
DROP POLICY IF EXISTS "Users can view active subscription plans" ON public.subscription_plans;

CREATE POLICY "Users can view active subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Gym owners can manage their gym subscription plans" 
ON public.subscription_plans 
FOR ALL
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = get_user_gym_id(auth.uid()));

CREATE POLICY "Admins can manage all subscription plans" 
ON public.subscription_plans 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. ADD gym_id to credits_transactions
ALTER TABLE public.credits_transactions 
ADD COLUMN gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

-- Update RLS policies for credits_transactions
DROP POLICY IF EXISTS "Users can view their own credit transactions" ON public.credits_transactions;
DROP POLICY IF EXISTS "Users can create their own credit transactions" ON public.credits_transactions;
DROP POLICY IF EXISTS "Gym owners can view gym member credit transactions" ON public.credits_transactions;
DROP POLICY IF EXISTS "Gym owners can create credit transactions for their gym members" ON public.credits_transactions;

CREATE POLICY "Users can view their own credit transactions" 
ON public.credits_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit transactions" 
ON public.credits_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gym owners can view their gym member credit transactions" 
ON public.credits_transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = get_user_gym_id(auth.uid()));

CREATE POLICY "Gym owners can create credit transactions for their gym members" 
ON public.credits_transactions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = get_user_gym_id(auth.uid()));

-- 5. UPDATE FUNCTIONS FOR MULTI-GYM SUPPORT

-- Replace get_user_gym_id with get_user_gyms that returns array
CREATE OR REPLACE FUNCTION public.get_user_gyms(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT ARRAY_AGG(DISTINCT gym_id)
  FROM public.user_gym_memberships
  WHERE user_id = _user_id 
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
$function$;

-- Keep original function for backwards compatibility but make it return first gym
CREATE OR REPLACE FUNCTION public.get_user_gym_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT gym_id
  FROM public.user_gym_memberships
  WHERE user_id = _user_id 
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1
$function$;

-- New function to get user credits for specific gym
CREATE OR REPLACE FUNCTION public.get_user_credits_for_gym(_user_id uuid, _gym_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(credits, 0)
  FROM public.gym_credits
  WHERE user_id = _user_id AND gym_id = _gym_id
$function$;

-- New function to get user subscription for specific gym
CREATE OR REPLACE FUNCTION public.get_user_subscription_for_gym(_user_id uuid, _gym_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT id
  FROM public.user_subscriptions
  WHERE user_id = _user_id 
    AND gym_id = _gym_id
    AND status = 'active'
    AND expires_at > now()
  LIMIT 1
$function$;

-- 6. UPDATE trigger for gym_credits instead of profiles.current_credits
DROP TRIGGER IF EXISTS update_current_credits ON public.credits_transactions;
DROP FUNCTION IF EXISTS public.update_current_credits();

-- New function to update gym credits
CREATE OR REPLACE FUNCTION public.update_gym_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_balance integer;
BEGIN
  -- Calculate new balance for this gym
  SELECT COALESCE(SUM(amount), 0) INTO new_balance
  FROM public.credits_transactions
  WHERE user_id = NEW.user_id AND gym_id = NEW.gym_id;
  
  -- Update or insert gym credits
  INSERT INTO public.gym_credits (user_id, gym_id, credits)
  VALUES (NEW.user_id, NEW.gym_id, new_balance)
  ON CONFLICT (user_id, gym_id)
  DO UPDATE SET 
    credits = new_balance,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Create trigger for gym credits
CREATE TRIGGER update_gym_credits
AFTER INSERT ON public.credits_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_gym_credits();

-- 7. DATA MIGRATION: Move existing credits from profiles to gym_credits
-- For each user with a gym membership, create gym_credits entry
INSERT INTO public.gym_credits (user_id, gym_id, credits)
SELECT DISTINCT 
  p.user_id,
  ugm.gym_id,
  COALESCE(p.current_credits, 0)
FROM public.profiles p
JOIN public.user_gym_memberships ugm ON p.user_id = ugm.user_id
WHERE ugm.status = 'active'
  AND COALESCE(p.current_credits, 0) > 0
ON CONFLICT (user_id, gym_id) DO NOTHING;

-- 8. Update existing subscription plans to be gym-specific
-- For now, duplicate existing plans for each gym
INSERT INTO public.subscription_plans (name, description, price, duration_days, credits_included, unlimited_access, is_trial, is_active, features, gym_id)
SELECT 
  sp.name,
  sp.description,
  sp.price,
  sp.duration_days,
  sp.credits_included,
  sp.unlimited_access,
  sp.is_trial,
  sp.is_active,
  sp.features,
  g.id as gym_id
FROM public.subscription_plans sp
CROSS JOIN public.gyms g
WHERE sp.gym_id IS NULL AND g.is_active = true;

-- 9. Update existing user_subscriptions to link to gym
UPDATE public.user_subscriptions
SET gym_id = (
  SELECT ugm.gym_id
  FROM public.user_gym_memberships ugm
  WHERE ugm.user_id = user_subscriptions.user_id
    AND ugm.status = 'active'
  LIMIT 1
)
WHERE gym_id IS NULL;

-- 10. Update existing credits_transactions to link to gym
UPDATE public.credits_transactions
SET gym_id = (
  SELECT ugm.gym_id
  FROM public.user_gym_memberships ugm
  WHERE ugm.user_id = credits_transactions.user_id
    AND ugm.status = 'active'
  LIMIT 1
)
WHERE gym_id IS NULL;

-- 11. Add triggers for automatic timestamp updates
CREATE TRIGGER update_gym_credits_updated_at
BEFORE UPDATE ON public.gym_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();