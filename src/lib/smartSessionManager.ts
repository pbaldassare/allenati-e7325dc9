import { supabase } from '@/integrations/supabase/client';
import type { ScheduleItem } from '@/types/schedule';

export interface ScheduleComparison {
  removed: any[];
  added: any[];
  unchanged: any[];
  modified: ScheduleModification[];
  deletedSessionsCount: number;
  createdSessionsCount: number;
  updatedSessionsCount: number;
  preservedSessionsCount: number;
  affectedBookings: number;
}

export interface ScheduleModification {
  oldSchedule: { dayOfWeek: number; time: string };
  newSchedule: ScheduleItem;
}

/**
 * Generate a unique ID for schedule tracking
 */
export function generateScheduleId(): string {
  return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compare old and new schedules to determine what changed
 * Now supports detecting MODIFICATIONS vs additions/removals
 */
export function compareSchedules(
  oldSchedules: any[], 
  newSchedules: ScheduleItem[]
): {
  removed: any[];
  added: ScheduleItem[];
  unchanged: any[];
  modified: ScheduleModification[];
} {
  const modified: ScheduleModification[] = [];
  const processedOldIds = new Set<string>();
  const processedNewIds = new Set<string>();

  // First pass: detect modifications (same ID, different values)
  for (const newSched of newSchedules) {
    if (newSched.originalDayOfWeek !== undefined && newSched.originalTime !== undefined) {
      // This schedule has original values - check if it was modified
      const wasModified = 
        newSched.dayOfWeek !== newSched.originalDayOfWeek ||
        newSched.time !== newSched.originalTime;
      
      if (wasModified) {
        // Find the matching old schedule
        const matchingOld = oldSchedules.find(old => 
          old.day_of_week === newSched.originalDayOfWeek &&
          old.start_time === newSched.originalTime
        );
        
        if (matchingOld) {
          modified.push({
            oldSchedule: { 
              dayOfWeek: newSched.originalDayOfWeek, 
              time: newSched.originalTime 
            },
            newSchedule: newSched
          });
          processedOldIds.add(`${matchingOld.day_of_week}_${matchingOld.start_time}`);
          processedNewIds.add(`${newSched.dayOfWeek}_${newSched.time}`);
        }
      }
    }
  }

  // Second pass: find removed schedules (not modified, not in new)
  const removed = oldSchedules.filter(oldSched => {
    const key = `${oldSched.day_of_week}_${oldSched.start_time}`;
    if (processedOldIds.has(key)) return false;
    
    return !newSchedules.some(newSched => 
      newSched.dayOfWeek === oldSched.day_of_week &&
      newSched.time === oldSched.start_time &&
      newSched.roomId === oldSched.room_id
    );
  });

  // Third pass: find added schedules (not modified, not in old)
  const added = newSchedules.filter(newSched => {
    const key = `${newSched.dayOfWeek}_${newSched.time}`;
    if (processedNewIds.has(key)) return false;
    
    return !oldSchedules.some(oldSched => 
      oldSched.day_of_week === newSched.dayOfWeek &&
      oldSched.start_time === newSched.time &&
      oldSched.room_id === newSched.roomId
    );
  });

  // Fourth pass: find unchanged schedules
  const unchanged = oldSchedules.filter(oldSched => {
    const key = `${oldSched.day_of_week}_${oldSched.start_time}`;
    if (processedOldIds.has(key)) return false;
    
    return newSchedules.some(newSched => 
      newSched.dayOfWeek === oldSched.day_of_week &&
      newSched.time === oldSched.start_time &&
      newSched.roomId === oldSched.room_id
    );
  });

  return { removed, added, unchanged, modified };
}

/**
 * Smart schedule update with intelligent session management
 * Now handles modifications separately from additions/removals
 */
export async function smartUpdateCourseSchedules(
  courseId: string, 
  newSchedules: ScheduleItem[],
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
    
    let totalUpdatedSessions = 0;
    let totalPreservedSessions = 0;

    // Step 1: Handle MODIFICATIONS first - update existing sessions instead of deleting
    for (const mod of comparison.modified) {
      console.log(`🔧 Processing modification: ${mod.oldSchedule.dayOfWeek}/${mod.oldSchedule.time} → ${mod.newSchedule.dayOfWeek}/${mod.newSchedule.time}`);
      
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_schedule_sessions', {
          p_course_id: courseId,
          p_old_day_of_week: mod.oldSchedule.dayOfWeek,
          p_old_start_time: mod.oldSchedule.time,
          p_new_day_of_week: mod.newSchedule.dayOfWeek,
          p_new_start_time: mod.newSchedule.time,
          p_new_end_time: mod.newSchedule.end_time,
          p_new_room_id: mod.newSchedule.roomId || null,
          p_new_room_name: null,
          p_new_max_participants: mod.newSchedule.maxParticipantsOverride || null,
          p_new_difficulty_level: mod.newSchedule.difficultyLevelOverride || null,
          p_from_date: null // Use default (today)
        });

      if (updateError) {
        console.error('❌ Error updating schedule sessions:', updateError);
      } else {
        const result = updateResult?.[0];
        totalUpdatedSessions += result?.updated_count || 0;
        totalPreservedSessions += result?.preserved_count || 0;
        console.log('✅ Schedule modification result:', result);
      }
    }

    // Step 2: Prepare schedules for RPC function (excluding modified ones that were already handled)
    // The RPC will handle additions, removals, and unchanged schedules
    const schedulesForRpc = newSchedules.map(schedule => ({
      day_of_week: schedule.dayOfWeek,
      start_time: schedule.time,
      end_time: schedule.end_time,
      room_id: schedule.roomId,
      room_name: null,
      max_participants_override: schedule.maxParticipantsOverride || null,
      difficulty_level_override: schedule.difficultyLevelOverride || null
    }));

    console.log('📋 Schedules prepared for RPC:', schedulesForRpc);

    // Step 3: Call the RPC function for the rest of the logic
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('smart_generate_sessions_with_weeks', {
        p_course_id: courseId,
        p_schedules: schedulesForRpc,
        p_duration_weeks: durationWeeks,
        p_start_date: null,
        p_max_participants: null
      });

    if (rpcError) {
      console.error('❌ RPC function error:', rpcError);
      
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
      modified: comparison.modified,
      deletedSessionsCount: result?.sessions_deleted || 0,
      createdSessionsCount: result?.sessions_created || 0,
      updatedSessionsCount: totalUpdatedSessions,
      preservedSessionsCount: totalPreservedSessions,
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

  if (comparison.modified.length > 0) {
    parts.push(`${comparison.modified.length} orari modificati`);
  }

  if (comparison.removed.length > 0) {
    parts.push(`${comparison.removed.length} orari rimossi`);
  }
  
  if (comparison.added.length > 0) {
    parts.push(`${comparison.added.length} orari aggiunti`);
  }
  
  if (comparison.unchanged.length > 0) {
    parts.push(`${comparison.unchanged.length} orari mantenuti`);
  }

  if (comparison.updatedSessionsCount > 0) {
    parts.push(`${comparison.updatedSessionsCount} sessioni aggiornate`);
  }

  if (comparison.preservedSessionsCount > 0) {
    parts.push(`⚠️ ${comparison.preservedSessionsCount} sessioni preservate (con prenotazioni)`);
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
