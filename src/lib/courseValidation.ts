import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ACTIVATION_ERROR_CODE = 'COURSE_ACTIVATION_NO_VALID_SCHEDULE';

export const COURSE_ACTIVATION_ERROR_MESSAGE =
  'Aggiungi prima almeno un orario con sala assegnata prima di attivare il corso.';

export function isCourseActivationError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    (err as any)?.message ??
    (err as any)?.error?.message ??
    String(err);
  return typeof msg === 'string' && msg.includes(ACTIVATION_ERROR_CODE);
}

/**
 * Conta gli schedule "validi" di un corso (attivi + con sala assegnata).
 */
export async function countValidSchedules(courseId: string): Promise<number> {
  const { data, error } = await supabase
    .from('course_schedules')
    .select('id, room_id, room_name')
    .eq('course_id', courseId)
    .eq('is_active', true);

  if (error) {
    console.error('countValidSchedules error', error);
    return 0;
  }
  return (data || []).filter(
    (s: any) => s.room_id || (s.room_name && String(s.room_name).trim() !== '')
  ).length;
}

/**
 * Hook: ritorna se un corso ha almeno uno schedule valido.
 * `null` finché in caricamento.
 */
export function useCourseHasValidSchedule(courseId?: string) {
  const [hasValid, setHasValid] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!courseId) {
      setHasValid(false);
      return;
    }
    (async () => {
      const c = await countValidSchedules(courseId);
      if (!cancelled) setHasValid(c > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return hasValid;
}

/**
 * Carica una mappa courseId -> hasValidSchedule per una lista di corsi.
 */
export async function loadValidSchedulesMap(
  courseIds: string[]
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (courseIds.length === 0) return map;

  const { data, error } = await supabase
    .from('course_schedules')
    .select('course_id, room_id, room_name, is_active')
    .in('course_id', courseIds)
    .eq('is_active', true);

  if (error) {
    console.error('loadValidSchedulesMap error', error);
    courseIds.forEach((id) => map.set(id, false));
    return map;
  }

  courseIds.forEach((id) => map.set(id, false));
  (data || []).forEach((s: any) => {
    const valid = s.room_id || (s.room_name && String(s.room_name).trim() !== '');
    if (valid) map.set(s.course_id, true);
  });
  return map;
}
