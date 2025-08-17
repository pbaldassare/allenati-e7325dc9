-- Step 1 Fixed: Handle NULL gym_id values properly

-- 1. Drop existing trigger first
DROP TRIGGER IF EXISTS update_gym_credits ON public.credits_transactions;

-- 2. CREATE gym_credits table if not exists
CREATE TABLE IF NOT EXISTS public.gym_credits (
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

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own gym credits" ON public.gym_credits;
DROP POLICY IF EXISTS "Users can insert their own gym credits" ON public.gym_credits;
DROP POLICY IF EXISTS "Users can update their own gym credits" ON public.gym_credits;
DROP POLICY IF EXISTS "Gym owners can view their gym member credits" ON public.gym_credits;
DROP POLICY IF EXISTS "Gym owners can update their gym member credits" ON public.gym_credits;

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

-- 3. ADD gym_id columns to existing tables if not exists
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.credits_transactions 
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

-- 4. DATA MIGRATION: Update existing records to have gym_id FIRST
-- Update existing user_subscriptions to link to gym
UPDATE public.user_subscriptions
SET gym_id = (
  SELECT ugm.gym_id
  FROM public.user_gym_memberships ugm
  WHERE ugm.user_id = user_subscriptions.user_id
    AND ugm.status = 'active'
  LIMIT 1
)
WHERE gym_id IS NULL;

-- Update existing credits_transactions to link to gym
UPDATE public.credits_transactions
SET gym_id = (
  SELECT ugm.gym_id
  FROM public.user_gym_memberships ugm
  WHERE ugm.user_id = credits_transactions.user_id
    AND ugm.status = 'active'
  LIMIT 1
)
WHERE gym_id IS NULL;

-- 5. FUNCTIONS FOR MULTI-GYM SUPPORT

-- New function to get all user gyms
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

-- Keep original function for backwards compatibility
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

-- 6. IMPROVED function to update gym credits with NULL checks
CREATE OR REPLACE FUNCTION public.update_gym_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_balance integer;
BEGIN
  -- Only process if gym_id is not NULL
  IF NEW.gym_id IS NULL THEN
    RETURN NEW;
  END IF;
  
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
AFTER INSERT OR UPDATE ON public.credits_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_gym_credits();

-- 7. DATA MIGRATION: Move existing credits from profiles to gym_credits
INSERT INTO public.gym_credits (user_id, gym_id, credits)
SELECT DISTINCT 
  p.user_id,
  ugm.gym_id,
  COALESCE(p.current_credits, 0)
FROM public.profiles p
JOIN public.user_gym_memberships ugm ON p.user_id = ugm.user_id
WHERE ugm.status = 'active'
  AND ugm.gym_id IS NOT NULL
  AND COALESCE(p.current_credits, 0) >= 0
ON CONFLICT (user_id, gym_id) DO NOTHING;

-- 8. Update existing subscription plans to be gym-specific (only if no gym_id exists)
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
WHERE sp.gym_id IS NULL 
  AND g.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.subscription_plans sp2 
    WHERE sp2.name = sp.name AND sp2.gym_id = g.id
  );

-- 9. Add triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_gym_credits_updated_at ON public.gym_credits;
CREATE TRIGGER update_gym_credits_updated_at
BEFORE UPDATE ON public.gym_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();