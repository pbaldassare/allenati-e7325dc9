
-- Validate course activation: a course can be is_active = true only if at least one
-- course_schedules row exists with is_active=true and a valid room (room_id NOT NULL
-- OR trim(room_name) <> '').

CREATE OR REPLACE FUNCTION public.validate_course_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Skip when nothing relevant changed on UPDATE
  IF TG_OP = 'UPDATE' AND OLD.is_active IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.course_schedules cs
  WHERE cs.course_id = NEW.id
    AND cs.is_active = true
    AND (cs.room_id IS NOT NULL OR coalesce(btrim(cs.room_name), '') <> '');

  IF v_count = 0 THEN
    RAISE EXCEPTION 'COURSE_ACTIVATION_NO_VALID_SCHEDULE: Aggiungi prima almeno un orario con sala assegnata prima di attivare il corso.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_course_activation ON public.courses;
CREATE TRIGGER trg_validate_course_activation
BEFORE INSERT OR UPDATE OF is_active ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.validate_course_activation();


-- Auto-deactivate course when its last valid schedule disappears
CREATE OR REPLACE FUNCTION public.enforce_course_active_on_schedule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_remaining integer;
  v_was_active boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_course_id := OLD.course_id;
  ELSE
    v_course_id := NEW.course_id;
  END IF;

  SELECT count(*) INTO v_remaining
  FROM public.course_schedules cs
  WHERE cs.course_id = v_course_id
    AND cs.is_active = true
    AND (cs.room_id IS NOT NULL OR coalesce(btrim(cs.room_name), '') <> '')
    AND (TG_OP = 'DELETE' OR cs.id <> NEW.id OR (
      NEW.is_active = true AND (NEW.room_id IS NOT NULL OR coalesce(btrim(NEW.room_name), '') <> '')
    ));

  -- Recount cleanly (the inline filter above gets tricky on UPDATE)
  SELECT count(*) INTO v_remaining
  FROM public.course_schedules cs
  WHERE cs.course_id = v_course_id
    AND cs.is_active = true
    AND (cs.room_id IS NOT NULL OR coalesce(btrim(cs.room_name), '') <> '');

  IF v_remaining = 0 THEN
    SELECT is_active INTO v_was_active FROM public.courses WHERE id = v_course_id;
    IF v_was_active IS TRUE THEN
      UPDATE public.courses SET is_active = false, updated_at = now() WHERE id = v_course_id;

      INSERT INTO public.admin_action_logs (admin_id, action, target_type, target_id, new_data)
      VALUES (
        coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
        'course_auto_deactivated_no_schedule',
        'course',
        v_course_id,
        jsonb_build_object('reason', 'last valid schedule removed')
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_course_active_on_schedule_change ON public.course_schedules;
CREATE TRIGGER trg_enforce_course_active_on_schedule_change
AFTER UPDATE OR DELETE ON public.course_schedules
FOR EACH ROW
EXECUTE FUNCTION public.enforce_course_active_on_schedule_change();
