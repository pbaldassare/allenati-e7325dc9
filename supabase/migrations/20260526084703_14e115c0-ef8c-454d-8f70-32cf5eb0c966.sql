CREATE OR REPLACE FUNCTION public.finalize_stripe_payment(
  _user_id uuid,
  _gym_id uuid,
  _plan_id uuid DEFAULT NULL,
  _credits_amount integer DEFAULT NULL,
  _amount numeric DEFAULT 0,
  _currency text DEFAULT 'EUR',
  _payment_intent text DEFAULT NULL,
  _session_id text DEFAULT NULL,
  _reconciled boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_reference_type text;
  v_reference_id uuid;
  v_plan record;
  v_starts_at timestamptz := now();
  v_expires_at timestamptz;
  v_subscription_id uuid;
  v_existing_credit_id uuid;
  v_completed_exists boolean;
BEGIN
  IF _user_id IS NULL OR _gym_id IS NULL THEN
    RAISE EXCEPTION 'Missing user or gym';
  END IF;

  IF _payment_intent IS NULL OR btrim(_payment_intent) = '' THEN
    RAISE EXCEPTION 'Missing Stripe payment intent';
  END IF;

  IF _plan_id IS NULL AND COALESCE(_credits_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Missing purchase target';
  END IF;

  INSERT INTO public.payments (
    user_id,
    amount,
    currency,
    status,
    payment_method,
    transaction_id,
    reference_type,
    reference_id,
    processed_at
  ) VALUES (
    _user_id,
    COALESCE(_amount, 0),
    COALESCE(NULLIF(upper(_currency), ''), 'EUR'),
    'completed'::public.payment_status,
    'stripe',
    _payment_intent,
    CASE WHEN _plan_id IS NOT NULL THEN 'subscription' ELSE 'credits' END,
    COALESCE(_plan_id, _gym_id),
    now()
  )
  ON CONFLICT (transaction_id) DO UPDATE
  SET transaction_id = EXCLUDED.transaction_id
  RETURNING id, reference_type, reference_id
  INTO v_payment_id, v_reference_type, v_reference_id;

  IF _plan_id IS NOT NULL THEN
    SELECT us.id
    INTO v_subscription_id
    FROM public.user_subscriptions us
    WHERE us.id = v_reference_id
      AND us.user_id = _user_id
      AND us.gym_id = _gym_id
      AND us.plan_id = _plan_id
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
      SELECT us.id
      INTO v_subscription_id
      FROM public.user_subscriptions us
      JOIN public.admin_action_logs al
        ON (al.new_data->>'subscription_id')::uuid = us.id
      WHERE al.action = 'payment_completed'
        AND al.new_data->>'stripe_payment_intent' = _payment_intent
        AND us.user_id = _user_id
        AND us.gym_id = _gym_id
        AND us.plan_id = _plan_id
      LIMIT 1;
    END IF;

    IF v_subscription_id IS NULL THEN
      SELECT *
      INTO v_plan
      FROM public.subscription_plans
      WHERE id = _plan_id
        AND gym_id = _gym_id
        AND is_active = true
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription plan not found';
      END IF;

      v_expires_at := v_starts_at + make_interval(days => COALESCE(NULLIF(v_plan.duration_days, 0), 30));

      INSERT INTO public.user_subscriptions (
        user_id,
        plan_id,
        gym_id,
        status,
        starts_at,
        expires_at,
        activated_at
      ) VALUES (
        _user_id,
        _plan_id,
        _gym_id,
        'active'::public.subscription_status,
        v_starts_at,
        v_expires_at,
        v_starts_at
      )
      RETURNING id INTO v_subscription_id;

      UPDATE public.payments
      SET reference_type = 'subscription', reference_id = v_subscription_id
      WHERE id = v_payment_id;

      IF COALESCE(v_plan.credits_included, 0) > 0 THEN
        INSERT INTO public.credits_transactions (
          user_id,
          gym_id,
          amount,
          balance_after,
          transaction_type,
          description,
          reference_id
        ) VALUES (
          _user_id,
          _gym_id,
          v_plan.credits_included,
          v_plan.credits_included,
          'subscription',
          'Crediti inclusi nell''abbonamento ' || v_plan.name,
          v_subscription_id
        );
      END IF;
    END IF;
  ELSE
    SELECT id
    INTO v_existing_credit_id
    FROM public.credits_transactions
    WHERE user_id = _user_id
      AND gym_id = _gym_id
      AND reference_id = v_payment_id
      AND transaction_type = 'purchase'
    LIMIT 1;

    IF v_existing_credit_id IS NULL THEN
      INSERT INTO public.credits_transactions (
        user_id,
        gym_id,
        amount,
        balance_after,
        transaction_type,
        description,
        reference_id
      ) VALUES (
        _user_id,
        _gym_id,
        _credits_amount,
        _credits_amount,
        'purchase',
        'Acquisto di ' || _credits_amount || ' crediti',
        v_payment_id
      )
      RETURNING id INTO v_existing_credit_id;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.admin_action_logs
    WHERE action = 'payment_completed'
      AND new_data->>'session_id' = _session_id
  ) INTO v_completed_exists;

  IF NOT v_completed_exists THEN
    INSERT INTO public.admin_action_logs (
      action,
      admin_id,
      target_type,
      target_id,
      new_data
    ) VALUES (
      'payment_completed',
      _user_id,
      CASE WHEN _plan_id IS NOT NULL THEN 'subscription' ELSE 'credits' END,
      COALESCE(v_subscription_id, v_payment_id, _gym_id),
      jsonb_build_object(
        'session_id', _session_id,
        'payment_id', v_payment_id,
        'subscription_id', v_subscription_id,
        'gym_id', _gym_id,
        'amount', COALESCE(_amount, 0),
        'currency', COALESCE(NULLIF(upper(_currency), ''), 'EUR'),
        'stripe_payment_intent', _payment_intent,
        'completed_at', now(),
        'reconciled', _reconciled
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'paid', true,
    'processed', true,
    'type', CASE WHEN _plan_id IS NOT NULL THEN 'subscription' ELSE 'credits' END,
    'payment_id', v_payment_id,
    'subscription_id', v_subscription_id,
    'credits_transaction_id', v_existing_credit_id,
    'already_logged', v_completed_exists
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_stripe_payment(uuid, uuid, uuid, integer, numeric, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_stripe_payment(uuid, uuid, uuid, integer, numeric, text, text, text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_stripe_payment(uuid, uuid, uuid, integer, numeric, text, text, text, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_stripe_payment(uuid, uuid, uuid, integer, numeric, text, text, text, boolean) TO service_role;