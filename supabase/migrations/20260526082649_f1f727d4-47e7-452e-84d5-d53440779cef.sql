-- Cancel duplicate active subscriptions: keep only the latest active per (user, gym)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, gym_id
           ORDER BY expires_at DESC, created_at DESC
         ) AS rn
  FROM public.user_subscriptions
  WHERE status = 'active'
    AND expires_at > now()
)
UPDATE public.user_subscriptions us
SET status = 'cancelled', updated_at = now()
FROM ranked r
WHERE us.id = r.id AND r.rn > 1;