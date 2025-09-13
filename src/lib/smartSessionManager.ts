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
 * Smart schedule update that only affects sessions for changed schedules
 */
export async function smartUpdateCourseSchedules(
  courseId: string, 
  newSchedules: any[],
  currentSchedules: any[]
): Promise<ScheduleComparison> {
  const comparison = compareSchedules(currentSchedules, newSchedules);
  
  let deletedSessionsCount = 0;
  let createdSessionsCount = 0;
  let affectedBookings = 0;

  try {
    // 1. Delete sessions for removed schedules
    if (comparison.removed.length > 0) {
      for (const removedSchedule of comparison.removed) {
        // Count affected bookings before deletion
        const { data: bookingsToCount } = await supabase
          .from('bookings')
          .select('id')
          .eq('course_id', courseId)
          .eq('status', 'confirmed')
          .gte('scheduled_date', new Date().toISOString().split('T')[0])
          .in('session_id', 
            (await supabase
              .from('course_sessions')
              .select('id')
              .eq('course_id', courseId)
              .eq('session_date', removedSchedule.session_date)
              .eq('start_time', removedSchedule.start_time)
              .gte('session_date', new Date().toISOString().split('T')[0])
            ).data?.map(s => s.id) || []
          );
        
        affectedBookings += bookingsToCount?.length || 0;

        // Delete future sessions for this specific schedule
        const { data: deletedSessions } = await supabase
          .from('course_sessions')
          .delete()
          .eq('course_id', courseId)
          .eq('start_time', removedSchedule.start_time)
          .gte('session_date', new Date().toISOString().split('T')[0])
          .select('id');
        
        deletedSessionsCount += deletedSessions?.length || 0;
      }
    }

    // 2. Update course schedules table
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

    // 3. Generate sessions only for new schedules
    if (comparison.added.length > 0) {
      const { regenerateCourseSessions } = await import('@/lib/sessionRegenerator');
      const result = await regenerateCourseSessions(courseId);
      
      if (result.success) {
        createdSessionsCount = result.createdSessions || 0;
      }
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