-- Fix remaining duplicates by keeping the newer subscription for each user

-- 1. Giulia Alessi - keep the newer subscription (2025-09-03 15:04:24) and cancel the older one
UPDATE public.user_subscriptions 
SET status = 'cancelled', updated_at = now()
WHERE id = '5951a57b-a97e-4598-a552-ac425ed3cb7f';

-- 2. Alessandro Bracaglia - keep the newer subscription (2025-09-02 07:44:44) and cancel the older one  
UPDATE public.user_subscriptions 
SET status = 'cancelled', updated_at = now()
WHERE id = 'a78b79b3-1891-4753-b9d0-dcbac233713b';

-- 3. Marika Schioppo - keep the newer subscription (2025-09-02 08:25:17) and cancel the older one
UPDATE public.user_subscriptions 
SET status = 'cancelled', updated_at = now()
WHERE id = '99c4cb55-acc2-4ca4-9032-72dcede9b255';