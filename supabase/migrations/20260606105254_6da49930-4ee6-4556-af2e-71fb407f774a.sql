
-- 1. Add is_multi_gym flag to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS is_multi_gym BOOLEAN NOT NULL DEFAULT false;

-- 2. Bridge table plan <-> gyms
CREATE TABLE IF NOT EXISTS public.subscription_plan_gyms (
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  gym_id  UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, gym_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_plan_gyms_gym ON public.subscription_plan_gyms(gym_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plan_gyms_plan ON public.subscription_plan_gyms(plan_id);

GRANT SELECT ON public.subscription_plan_gyms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plan_gyms TO authenticated;
GRANT ALL ON public.subscription_plan_gyms TO service_role;

ALTER TABLE public.subscription_plan_gyms ENABLE ROW LEVEL SECURITY;

-- Public read (same as subscription_plans visibility)
CREATE POLICY "Anyone can view plan-gym links"
  ON public.subscription_plan_gyms FOR SELECT
  USING (true);

-- Owners of the gym can manage
CREATE POLICY "Owners can insert plan-gym links"
  ON public.subscription_plan_gyms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_gym_memberships ugm
      WHERE ugm.gym_id = subscription_plan_gyms.gym_id
        AND ugm.user_id = auth.uid()
        AND ugm.membership_type = 'owner'
        AND ugm.status = 'active'
    )
  );

CREATE POLICY "Owners can delete plan-gym links"
  ON public.subscription_plan_gyms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_gym_memberships ugm
      WHERE ugm.gym_id = subscription_plan_gyms.gym_id
        AND ugm.user_id = auth.uid()
        AND ugm.membership_type = 'owner'
        AND ugm.status = 'active'
    )
  );

-- 3. Trigger: on user_subscriptions insert, if plan is multi-gym,
--    create active member memberships for all linked gyms
CREATE OR REPLACE FUNCTION public.handle_multi_gym_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_multi BOOLEAN;
BEGIN
  SELECT is_multi_gym INTO v_is_multi
  FROM public.subscription_plans
  WHERE id = NEW.plan_id;

  IF COALESCE(v_is_multi, false) THEN
    INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
    SELECT NEW.user_id, spg.gym_id, 'member', 'active'
    FROM public.subscription_plan_gyms spg
    WHERE spg.plan_id = NEW.plan_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_multi_gym_subscription ON public.user_subscriptions;
CREATE TRIGGER trg_multi_gym_subscription
  AFTER INSERT ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_multi_gym_subscription();
