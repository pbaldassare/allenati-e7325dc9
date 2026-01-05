import { supabase } from '@/integrations/supabase/client';

export interface SessionRegenerationResult {
  deletedSessions: number;
  createdSessions: number;
  cancelledSessions: number;
  affectedBookings: number;
  success: boolean;
  message: string;
  warnings: string[];
}

/**
 * Regenera le sessioni di un corso usando la funzione smart che:
 * - Mantiene le sessioni che corrispondono agli orari attivi
 * - Cancella (status='cancelled') le sessioni con prenotazioni che non corrispondono più
 * - Elimina solo le sessioni senza prenotazioni che non corrispondono più
 */
export async function regenerateCourseSessions(
  courseId: string,
  durationWeeks: number = 12
): Promise<SessionRegenerationResult> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const warnings: string[] = [];
    
    console.log('🔄 Inizio rigenerazione sessioni sicura per corso:', courseId);

    // 1. Ottieni gli orari attuali del corso
    const { data: schedules, error: schedulesError } = await supabase
      .from('course_schedules')
      .select('day_of_week, start_time, end_time, room_id, room_name, max_participants_override, difficulty_level_override')
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (schedulesError) {
      console.error('Errore nel recupero degli orari:', schedulesError);
      throw schedulesError;
    }

    // 2. Ottieni max_participants dal corso
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('max_participants, duration_weeks')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('Errore nel recupero del corso:', courseError);
      throw courseError;
    }

    const effectiveDurationWeeks = courseData?.duration_weeks || durationWeeks;
    const maxParticipants = courseData?.max_participants || 10;

    // 3. Prepara gli orari nel formato JSON
    const schedulesJson = (schedules || []).map(s => ({
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      room_id: s.room_id,
      room_name: s.room_name,
      max_participants_override: s.max_participants_override,
      difficulty_level_override: s.difficulty_level_override
    }));

    console.log(`📊 Trovati ${schedulesJson.length} orari attivi, durata: ${effectiveDurationWeeks} settimane`);

    // 4. Chiama la funzione smart che gestisce tutto lato DB
    const { data: result, error: rpcError } = await supabase.rpc('smart_generate_sessions_with_weeks', {
      p_course_id: courseId,
      p_schedules: schedulesJson,
      p_duration_weeks: effectiveDurationWeeks,
      p_start_date: today,
      p_max_participants: maxParticipants
    });

    if (rpcError) {
      console.error('Errore nella rigenerazione:', rpcError);
      throw rpcError;
    }

    console.log('✅ Risultato rigenerazione:', result);

    // Cast result to expected type
    const rpcResult = result as { 
      sessions_created?: number; 
      sessions_deleted?: number; 
      sessions_cancelled?: number; 
      affected_bookings?: number;
    } | null;

    const sessionsCreated = rpcResult?.sessions_created || 0;
    const sessionsDeleted = rpcResult?.sessions_deleted || 0;
    const sessionsCancelled = rpcResult?.sessions_cancelled || 0;
    const affectedBookings = rpcResult?.affected_bookings || 0;

    if (sessionsCancelled > 0) {
      warnings.push(`${sessionsCancelled} sessioni con prenotazioni sono state annullate (non eliminate) per preservare lo storico`);
    }

    if (affectedBookings > 0) {
      warnings.push(`${affectedBookings} prenotazioni sono state influenzate dalla modifica degli orari`);
    }

    const message = `Sessioni aggiornate: ${sessionsCreated} create, ${sessionsDeleted} eliminate, ${sessionsCancelled} annullate`;
    
    return {
      deletedSessions: sessionsDeleted,
      createdSessions: sessionsCreated,
      cancelledSessions: sessionsCancelled,
      affectedBookings,
      success: true,
      message,
      warnings
    };

  } catch (error) {
    console.error('❌ Errore nella rigenerazione delle sessioni:', error);
    return {
      deletedSessions: 0,
      createdSessions: 0,
      cancelledSessions: 0,
      affectedBookings: 0,
      success: false,
      message: `Errore nella rigenerazione delle sessioni: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
      warnings: []
    };
  }
}

/**
 * Ripara le prenotazioni orfane (session_id = NULL) per un corso specifico
 * Ricollegandole a sessioni esistenti o creando sessioni placeholder
 */
export async function repairOrphanBookings(courseId?: string): Promise<{
  repaired: number;
  sessionsCreated: number;
  sessionsRelinked: number;
  success: boolean;
  message: string;
}> {
  try {
    console.log('🔧 Riparazione prenotazioni orfane', courseId ? `per corso: ${courseId}` : 'per tutti i corsi');

    const { data, error } = await supabase.rpc('repair_orphan_bookings', {
      _course_id: courseId || null
    });

    if (error) {
      console.error('Errore nella riparazione:', error);
      throw error;
    }

    const result = data?.[0] || { repaired_count: 0, sessions_created: 0, sessions_relinked: 0 };

    console.log('✅ Risultato riparazione:', result);

    return {
      repaired: result.repaired_count,
      sessionsCreated: result.sessions_created,
      sessionsRelinked: result.sessions_relinked,
      success: true,
      message: `Riparate ${result.repaired_count} prenotazioni (${result.sessions_relinked} ricollegate, ${result.sessions_created} sessioni create)`
    };

  } catch (error) {
    console.error('❌ Errore nella riparazione delle prenotazioni:', error);
    return {
      repaired: 0,
      sessionsCreated: 0,
      sessionsRelinked: 0,
      success: false,
      message: `Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
    };
  }
}
