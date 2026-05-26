WITH restore_candidates AS (
  SELECT us.id
  FROM public.user_subscriptions us
  WHERE us.status = 'cancelled'
    AND us.expires_at > now()
    AND us.updated_at >= TIMESTAMPTZ '2026-05-26 08:26:00+00'
    AND us.updated_at < TIMESTAMPTZ '2026-05-26 08:27:30+00'
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_subscriptions active_same_plan
      WHERE active_same_plan.user_id = us.user_id
        AND active_same_plan.gym_id = us.gym_id
        AND active_same_plan.plan_id = us.plan_id
        AND active_same_plan.status = 'active'
        AND active_same_plan.expires_at > now()
        AND active_same_plan.id <> us.id
    )
), restored AS (
  UPDATE public.user_subscriptions us
  SET status = 'active', updated_at = now()
  FROM restore_candidates rc
  WHERE us.id = rc.id
  RETURNING us.id, us.user_id, us.gym_id, us.plan_id, us.expires_at
)
INSERT INTO public.admin_action_logs (
  admin_id,
  action,
  target_type,
  target_id,
  new_data
)
SELECT
  user_id,
  'subscription_restored_after_cleanup_fix',
  'subscription',
  id,
  jsonb_build_object(
    'subscription_id', id,
    'gym_id', gym_id,
    'plan_id', plan_id,
    'expires_at', expires_at,
    'reason', 'restore subscriptions cancelled by overly broad duplicate cleanup on 2026-05-26 08:26 UTC'
  )
FROM restored;