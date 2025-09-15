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
  try {
    console.log(`🔄 Starting smart schedule update for course ${courseId} with ${newSchedules.length} schedules`);
    
    // Validate schedules before processing
    const invalidSchedules = newSchedules.filter(schedule => !schedule.roomId || schedule.roomId === '');
    if (invalidSchedules.length > 0) {
      throw new Error(`Tutti gli orari devono avere una sala selezionata. ${invalidSchedules.length} orario/i senza sala.`);
    }
    
    // Compare schedules to understand changes
    const comparison = compareSchedules(currentSchedules, newSchedules);
    console.log('📊 Schedule comparison result:', comparison);
    
    // Prepare schedules for RPC function - convert to the format expected by the function
    const schedulesForRpc = newSchedules.map(schedule => ({
      day_of_week: schedule.dayOfWeek,
      start_time: schedule.time,
      end_time: schedule.end_time,
      room_id: schedule.roomId,
      room_name: schedule.room_name
    }));

    console.log('📋 Schedules prepared for RPC:', schedulesForRpc);

    // Call the RPC function with new schedules - this handles everything internally
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('smart_generate_sessions_with_weeks', {
        _course_id: courseId,
        _duration_weeks: durationWeeks,
        _start_date: null,
        _new_schedules: schedulesForRpc
      });

    if (rpcError) {
      console.error('❌ RPC function error:', rpcError);
      
      // Enhanced error handling for RPC calls
      if (rpcError.message?.toLowerCase().includes('policy')) {
        throw new Error('Errore di sicurezza nella generazione delle sessioni. Contatta l\'amministratore.');
      } else if (rpcError.message?.toLowerCase().includes('permission denied')) {
        throw new Error('Permesso negato durante la generazione delle sessioni.');
      }
      
      throw new Error(`Errore nella generazione delle sessioni: ${rpcError.message}`);
    }

    console.log('✅ RPC function completed successfully:', rpcResult);

    const result = rpcResult?.[0];
    
    // Return detailed comparison with RPC results
    return {
      removed: comparison.removed,
      added: comparison.added,
      unchanged: comparison.unchanged,
      deletedSessionsCount: result?.sessions_deleted || 0,
      createdSessionsCount: result?.sessions_created || 0,
      affectedBookings: result?.affected_bookings || 0
    };

  } catch (error) {
    console.error('💥 Fatal error in smartUpdateCourseSchedules:', error);
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