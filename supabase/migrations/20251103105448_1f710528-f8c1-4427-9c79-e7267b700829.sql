-- Function to check and expire subscriptions automatically
CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If subscription is active but expired, mark as expired
  IF NEW.status = 'active' AND NEW.expires_at < now() THEN
    NEW.status = 'expired';
    NEW.updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_subscriptions to auto-expire on read/write
DROP TRIGGER IF EXISTS trigger_check_subscription_expiry ON user_subscriptions;
CREATE TRIGGER trigger_check_subscription_expiry
  BEFORE INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION check_subscription_expiry();

-- Manual function to expire all active but past-date subscriptions
CREATE OR REPLACE FUNCTION auto_expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update subscriptions that have expired
  UPDATE user_subscriptions
  SET 
    status = 'expired',
    updated_at = now()
  WHERE 
    status = 'active'
    AND expires_at < now();
END;
$$;

COMMENT ON FUNCTION check_subscription_expiry() IS 'Automatically expires subscriptions when accessed if past expiry date';
COMMENT ON FUNCTION auto_expire_subscriptions() IS 'Batch function to expire all active subscriptions past their expiry date';