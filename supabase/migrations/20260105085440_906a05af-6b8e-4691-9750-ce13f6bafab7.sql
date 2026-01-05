-- 1. Aggiornare il trigger check_subscription_expiry per gestire pacchetti crediti
CREATE OR REPLACE FUNCTION public.check_subscription_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_record RECORD;
  current_credits INTEGER;
  future_bookings INTEGER;
BEGIN
  -- Get the subscription plan details
  SELECT credits_included, unlimited_access 
  INTO plan_record
  FROM public.subscription_plans 
  WHERE id = NEW.plan_id;
  
  -- For UNLIMITED plans (mensili/annuali): expire by date only
  IF plan_record.unlimited_access = true THEN
    IF NEW.status = 'active' AND NEW.expires_at < now() THEN
      NEW.status = 'expired';
      NEW.updated_at = now();
    END IF;
    RETURN NEW;
  END IF;
  
  -- For CREDIT-ONLY plans: check credits AND future bookings
  IF plan_record.credits_included > 0 AND plan_record.unlimited_access = false THEN
    -- Get current credits for this user/gym
    SELECT COALESCE(gc.credits, 0) INTO current_credits
    FROM public.gym_credits gc
    WHERE gc.user_id = NEW.user_id AND gc.gym_id = NEW.gym_id;
    
    -- If no record found, credits = 0
    IF current_credits IS NULL THEN
      current_credits := 0;
    END IF;
    
    -- Count future confirmed bookings for this gym
    SELECT COUNT(*) INTO future_bookings
    FROM public.bookings b
    JOIN public.courses c ON b.course_id = c.id
    WHERE b.user_id = NEW.user_id
      AND c.gym_id = NEW.gym_id
      AND b.status = 'confirmed'
      AND b.scheduled_date >= CURRENT_DATE;
    
    -- Expire only if: 0 credits AND 0 future bookings
    IF NEW.status = 'active' 
       AND current_credits = 0 
       AND future_bookings = 0 THEN
      NEW.status = 'expired';
      NEW.updated_at = now();
    END IF;
    
    -- Re-activate if: was expired but now has credits
    IF NEW.status = 'expired' AND current_credits > 0 THEN
      NEW.status = 'active';
      NEW.updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Creare trigger per riattivare subscription quando i crediti aumentano
CREATE OR REPLACE FUNCTION public.reactivate_subscription_on_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If credits increased from 0 (or NULL) to positive value
  IF (COALESCE(OLD.credits, 0) = 0) AND NEW.credits > 0 THEN
    -- Reactivate the most recent expired credit-based subscription for this user/gym
    UPDATE public.user_subscriptions us
    SET status = 'active', updated_at = now()
    WHERE us.user_id = NEW.user_id
      AND us.gym_id = NEW.gym_id
      AND us.status = 'expired'
      AND EXISTS (
        SELECT 1 FROM public.subscription_plans sp
        WHERE sp.id = us.plan_id
          AND sp.credits_included > 0
          AND sp.unlimited_access = false
      )
      AND us.id = (
        SELECT sub.id FROM public.user_subscriptions sub
        JOIN public.subscription_plans sp2 ON sub.plan_id = sp2.id
        WHERE sub.user_id = NEW.user_id
          AND sub.gym_id = NEW.gym_id
          AND sub.status = 'expired'
          AND sp2.credits_included > 0
          AND sp2.unlimited_access = false
        ORDER BY sub.updated_at DESC
        LIMIT 1
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_reactivate_on_credits ON public.gym_credits;
CREATE TRIGGER trigger_reactivate_on_credits
  AFTER UPDATE ON public.gym_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.reactivate_subscription_on_credits();

-- Also trigger on INSERT (when first credits are added)
DROP TRIGGER IF EXISTS trigger_reactivate_on_credits_insert ON public.gym_credits;
CREATE TRIGGER trigger_reactivate_on_credits_insert
  AFTER INSERT ON public.gym_credits
  FOR EACH ROW
  WHEN (NEW.credits > 0)
  EXECUTE FUNCTION public.reactivate_subscription_on_credits();

-- 3. Aggiornare la funzione batch auto_expire_subscriptions
CREATE OR REPLACE FUNCTION public.auto_expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Expire UNLIMITED subscriptions by date
  UPDATE public.user_subscriptions us
  SET status = 'expired', updated_at = now()
  WHERE us.status = 'active'
    AND us.expires_at < now()
    AND EXISTS (
      SELECT 1 FROM public.subscription_plans sp
      WHERE sp.id = us.plan_id AND sp.unlimited_access = true
    );
  
  -- Expire CREDIT-ONLY subscriptions only if 0 credits AND 0 future bookings
  UPDATE public.user_subscriptions us
  SET status = 'expired', updated_at = now()
  WHERE us.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.subscription_plans sp
      WHERE sp.id = us.plan_id 
        AND sp.credits_included > 0 
        AND sp.unlimited_access = false
    )
    AND COALESCE((
      SELECT gc.credits 
      FROM public.gym_credits gc 
      WHERE gc.user_id = us.user_id AND gc.gym_id = us.gym_id
    ), 0) = 0
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.courses c ON b.course_id = c.id
      WHERE b.user_id = us.user_id
        AND c.gym_id = us.gym_id
        AND b.status = 'confirmed'
        AND b.scheduled_date >= CURRENT_DATE
    );
END;
$$;