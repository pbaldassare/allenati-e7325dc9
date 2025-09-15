import { supabase } from '@/integrations/supabase/client';

export interface ScheduleComparison {
  removed: any[];
  added: any[];
  unchanged: any[];
  deletedSessionsCount: number;
  createdSessionsCount: number;
  affectedBookings: number;
}

/**
 * Compare old and new schedules to determine what changed
 */
export function compareSchedules(oldSchedules: any[], newSchedules: any[]): {
  removed: any[];
  added: any[];
  unchanged: any[];
} {
  const removed = oldSchedules.filter(oldSched => 
    !newSchedules.some(newSched => 
      newSched.dayOfWeek === oldSched.day_of_week &&
      newSched.time === oldSched.start_time &&
      newSched.roomId === oldSched.room_id
    )
  );

  const added = newSchedules.filter(newSched => 
    !oldSchedules.some(oldSched => 
      oldSched.day_of_week === newSched.dayOfWeek &&
      oldSched.start_time === newSched.time &&
      oldSched.room_id === newSched.roomId
    )
  );

  const unchanged = oldSchedules.filter(oldSched => 
    newSchedules.some(newSched => 
      newSched.dayOfWeek === oldSched.day_of_week &&
      newSched.time === oldSched.start_time &&
      newSched.roomId === oldSched.room_id
    )
  );

  return { removed, added, unchanged };
}

/**
 * Smart schedule update with intelligent session management
 */
export async function smartUpdateCourseSchedules(
  courseId: string, 
  newSchedules: any[],
  currentSchedules: any[],
  durationWeeks: number = 12
): Promise<ScheduleComparison> {
  const comparison = compareSchedules(currentSchedules, newSchedules);
  
  let deletedSessionsCount = 0;
  let createdSessionsCount = 0;
  let affectedBookings = 0;

  try {
    // 1. Update course schedules table first
    await supabase
      .from('course_schedules')
      .delete()
      .eq('course_id', courseId);

    if (newSchedules.length > 0) {
      const schedulesToInsert = newSchedules.map(schedule => ({
        course_id: courseId,
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.time,
        end_time: schedule.end_time,
        room_id: schedule.roomId,
        room_name: schedule.room_name,
      }));

      await supabase
        .from('course_schedules')
        .insert(schedulesToInsert);
    }

    // 2. Use the new smart generation function for comprehensive session management
    const { data: result, error } = await supabase.rpc('smart_generate_sessions_with_weeks', {
      _course_id: courseId,
      _duration_weeks: durationWeeks
    });

    if (error) {
      console.error('Error calling smart_generate_sessions_with_weeks:', error);
      throw error;
    }

    if (result && Array.isArray(result) && result.length > 0) {
      const resultData = result[0];
      deletedSessionsCount = resultData.sessions_deleted || 0;
      createdSessionsCount = resultData.sessions_created || 0;
      affectedBookings = resultData.affected_bookings || 0;
      
      console.log('✅ Smart session generation result:', resultData);
    }

    return {
      removed: comparison.removed,
      added: comparison.added,
      unchanged: comparison.unchanged,
      deletedSessionsCount,
      createdSessionsCount,
      affectedBookings
    };

  } catch (error) {
    console.error('Error in smart schedule update:', error);
    throw error;
  }
}

/**
 * Get a human-readable summary of schedule changes
 */
export function getScheduleChangeSummary(comparison: ScheduleComparison): string {
  const parts = [];

  if (comparison.removed.length > 0) {
    parts.push(`${comparison.removed.length} orari rimossi`);
  }
  
  if (comparison.added.length > 0) {
    parts.push(`${comparison.added.length} orari aggiunti`);
  }
  
  if (comparison.unchanged.length > 0) {
    parts.push(`${comparison.unchanged.length} orari mantenuti`);
  }

  if (comparison.deletedSessionsCount > 0) {
    parts.push(`${comparison.deletedSessionsCount} sessioni future eliminate`);
  }

  if (comparison.createdSessionsCount > 0) {
    parts.push(`${comparison.createdSessionsCount} nuove sessioni create`);
  }

  if (comparison.affectedBookings > 0) {
    parts.push(`⚠️ ${comparison.affectedBookings} prenotazioni potrebbero essere state cancellate`);
  }

  return parts.join(', ');
}