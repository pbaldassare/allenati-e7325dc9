import { supabase } from '@/integrations/supabase/client';

export interface SessionRegenerationResult {
  deletedSessions: number;
  createdSessions: number;
  affectedBookings: number;
  success: boolean;
  message: string;
}

/**
 * Regenera automaticamente le sessioni future di un corso dopo la modifica degli orari
 * Elimina solo le sessioni future senza prenotazioni confermate e rigenera con i nuovi orari
 */
export async function regenerateCourseSessions(
  courseId: string,
  endDate?: Date
): Promise<SessionRegenerationResult> {
  try {
    // 1. Conta le sessioni che verranno eliminate
    const { count: sessionsToDelete } = await supabase
      .from('course_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .gte('session_date', new Date().toISOString().split('T')[0])
      .not('id', 'in', `(
        SELECT DISTINCT session_id 
        FROM bookings 
        WHERE session_id IS NOT NULL 
          AND status = 'confirmed'
          AND course_id = '${courseId}'
      )`);

    // 2. Conta le prenotazioni che potrebbero essere affette
    const { count: affectedBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'confirmed')
      .gte('scheduled_date', new Date().toISOString().split('T')[0]);

    // 3. Elimina le sessioni future senza prenotazioni confermate
    const { error: deleteError } = await supabase
      .from('course_sessions')
      .delete()
      .eq('course_id', courseId)
      .gte('session_date', new Date().toISOString().split('T')[0])
      .not('id', 'in', `(
        SELECT DISTINCT session_id 
        FROM bookings 
        WHERE session_id IS NOT NULL 
          AND status = 'confirmed'
          AND course_id = '${courseId}'
      )`);

    if (deleteError) {
      throw deleteError;
    }

    // 4. Rigenera le sessioni usando la funzione database
    const endDateStr = endDate 
      ? endDate.toISOString().split('T')[0]
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 mesi

    const { data: generatedCount, error: generateError } = await supabase
      .rpc('generate_course_sessions', {
        _course_id: courseId,
        _start_date: new Date().toISOString().split('T')[0],
        _end_date: endDateStr
      });

    if (generateError) {
      throw generateError;
    }

    return {
      deletedSessions: sessionsToDelete || 0,
      createdSessions: generatedCount || 0,
      affectedBookings: affectedBookings || 0,
      success: true,
      message: `Sessioni aggiornate: ${sessionsToDelete || 0} eliminate, ${generatedCount || 0} rigenerate`
    };

  } catch (error) {
    console.error('Error regenerating course sessions:', error);
    return {
      deletedSessions: 0,
      createdSessions: 0,
      affectedBookings: 0,
      success: false,
      message: `Errore nella rigenerazione delle sessioni: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
    };
  }
}