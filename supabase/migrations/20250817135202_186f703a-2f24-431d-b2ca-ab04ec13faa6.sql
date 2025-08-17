-- Step 1A: Create gym_credits table and basic structure only

-- 1. CREATE gym_credits table
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

-- Create basic policies for gym_credits
CREATE POLICY "Users can view their own gym credits" 
ON public.gym_credits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gym credits" 
ON public.gym_credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. ADD gym_id columns to existing tables if not exists
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

ALTER TABLE public.credits_transactions 
ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE;

-- 3. New functions for multi-gym support
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

CREATE OR REPLACE FUNCTION public.get_user_credits_for_gym(_user_id uuid, _gym_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(credits, 0)
  FROM public.gym_credits
  WHERE user_id = _user_id AND gym_id = _gym_id
$function$;