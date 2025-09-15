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

  console.log('🔄 Starting smart schedule update for course:', courseId);
  console.log('📅 Current schedules count:', currentSchedules.length);
  console.log('📅 New schedules count:', newSchedules.length);
  console.log('⏱️ Duration weeks:', durationWeeks);

  try {
    // 1. CRITICAL: Delete ALL existing future sessions FIRST with verification
    console.log('🗑️ Step 1: Deleting all future sessions...');
    const todayDate = new Date().toISOString().split('T')[0];
    
    // First, count how many sessions we're about to delete
    const { count: existingSessionsCount, error: countError } = await supabase
      .from('course_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .gte('session_date', todayDate);

    if (countError) {
      console.error('❌ Error counting existing sessions:', countError);
      throw countError;
    }

    console.log(`📊 Found ${existingSessionsCount} existing future sessions to delete`);

    // Delete all future sessions with proper error handling
    const { error: deleteError, count: deletedCount } = await supabase
      .from('course_sessions')
      .delete({ count: 'exact' })
      .eq('course_id', courseId)
      .gte('session_date', todayDate);

    if (deleteError) {
      console.error('❌ CRITICAL: Failed to delete existing sessions:', deleteError);
      throw new Error(`Failed to delete existing sessions: ${deleteError.message}`);
    }

    console.log(`✅ Successfully deleted ${deletedCount} future sessions`);

    // Verify deletion was successful
    const { count: remainingSessions, error: verifyError } = await supabase
      .from('course_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .gte('session_date', todayDate);

    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError);
      throw verifyError;
    }

    if (remainingSessions && remainingSessions > 0) {
      console.error('❌ CRITICAL: Some sessions were not deleted. Remaining:', remainingSessions);
      throw new Error(`Failed to delete all sessions. ${remainingSessions} sessions remaining.`);
    }

    console.log('✅ Verified: All future sessions deleted successfully');

    // 2. Update course schedules table
    console.log('📝 Step 2: Updating course schedules...');
    const { error: deleteSchedulesError } = await supabase
      .from('course_schedules')
      .delete()
      .eq('course_id', courseId);

    if (deleteSchedulesError) {
      console.error('❌ Error deleting course schedules:', deleteSchedulesError);
      throw deleteSchedulesError;
    }

    if (newSchedules.length > 0) {
      const schedulesToInsert = newSchedules.map(schedule => ({
        course_id: courseId,
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.time,
        end_time: schedule.end_time,
        room_id: schedule.roomId,
        room_name: schedule.room_name,
      }));

      const { error: insertSchedulesError } = await supabase
        .from('course_schedules')
        .insert(schedulesToInsert);

      if (insertSchedulesError) {
        console.error('❌ Error inserting new course schedules:', insertSchedulesError);
        // Enhanced RLS error handling
        if (insertSchedulesError.message?.includes('row-level security')) {
          console.error('🔒 RLS Error - Check user permissions and authentication');
          throw new Error('Permission denied: Cannot update course schedules. Please check your access rights.');
        }
        throw new Error(`Failed to insert new schedules: ${insertSchedulesError.message}`);
      }

      console.log(`✅ Inserted ${schedulesToInsert.length} new course schedules`);
    }

    // 3. Wait a brief moment to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Generate new sessions with the improved RPC function
    console.log('🔧 Step 3: Generating new sessions with RPC...');
    const { data: result, error: rpcError } = await supabase.rpc('smart_generate_sessions_with_weeks', {
      _course_id: courseId,
      _duration_weeks: durationWeeks
    });

    if (rpcError) {
      console.error('❌ Error calling smart_generate_sessions_with_weeks:', rpcError);
      // Enhanced RLS error handling for RPC
      if (rpcError.message?.includes('row-level security')) {
        console.error('🔒 RLS Error in RPC - Function should now bypass RLS with SECURITY DEFINER');
        throw new Error('Database permission error: RPC function failed to access course schedules. This should be resolved with the latest fix.');
      }
      throw new Error(`RPC function failed: ${rpcError.message}`);
    }

    if (result && result.length > 0) {
      const firstResult = result[0];
      deletedSessionsCount = firstResult.sessions_deleted || 0;
      createdSessionsCount = firstResult.sessions_created || 0;
      affectedBookings = firstResult.affected_bookings || 0;
      
      console.log('✅ Smart session generation result:', firstResult);
      console.log(`📊 Summary: ${deletedCount} deleted manually + ${deletedSessionsCount} by RPC, ${createdSessionsCount} created, ${affectedBookings} bookings affected`);
    }

    return {
      removed: comparison.removed,
      added: comparison.added,
      unchanged: comparison.unchanged,
      deletedSessionsCount: deletedCount || 0,
      createdSessionsCount,
      affectedBookings
    };

  } catch (error) {
    console.error('❌ FATAL ERROR in smart schedule update:', error);
    console.error('🔧 Error details:', {
      courseId,
      newSchedulesCount: newSchedules.length,
      currentSchedulesCount: currentSchedules.length,
      durationWeeks,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
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