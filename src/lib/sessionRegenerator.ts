import { supabase } from '@/integrations/supabase/client';

export interface SessionRegenerationResult {
  deletedSessions: number;
  createdSessions: number;
  affectedBookings: number;
  deletedOrphanSessions: number;
  success: boolean;
  message: string;
  warnings: string[];
}

// Function to forcefully delete all future sessions for emergency cleanup
export async function forceDeleteAllFutureSessions(courseId: string): Promise<{ success: boolean; deletedCount: number; message: string }> {
  console.log(`🚨 FORCE DELETE: Eliminazione forzata di tutte le sessioni future per corso ${courseId}`);
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    // Count sessions to be deleted
    const { count: sessionsCount, error: countError } = await supabase
      .from('course_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .gte('session_date', todayString);

    if (countError) {
      throw new Error(`Failed to count sessions: ${countError.message}`);
    }

    const sessionsToDelete = sessionsCount || 0;
    console.log(`🗑️ FORCE DELETE: Eliminerò ${sessionsToDelete} sessioni future`);

    // Force delete all future sessions
    const { error: deleteError } = await supabase
      .from('course_sessions')
      .delete()
      .eq('course_id', courseId)
      .gte('session_date', todayString);

    if (deleteError) {
      throw new Error(`Failed to delete sessions: ${deleteError.message}`);
    }

    // Verify deletion
    const { count: remainingCount, error: verifyError } = await supabase
      .from('course_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .gte('session_date', todayString);

    if (verifyError) {
      console.error('⚠️ Errore nella verifica eliminazione:', verifyError);
    }

    const remainingSessions = remainingCount || 0;
    console.log(`✅ FORCE DELETE: Sessioni rimanenti dopo eliminazione: ${remainingSessions}`);

    return {
      success: remainingSessions === 0,
      deletedCount: sessionsToDelete,
      message: remainingSessions === 0 
        ? `✅ Eliminate con successo ${sessionsToDelete} sessioni future`
        : `⚠️ Eliminate ${sessionsToDelete} sessioni ma ne rimangono ancora ${remainingSessions}`
    };

  } catch (error) {
    console.error('❌ FORCE DELETE fallito:', error);
    return {
      success: false,
      deletedCount: 0,
      message: `❌ Errore nell'eliminazione forzata: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
    };
  }
}

/**
 * Elimina tutte le sessioni orfane che non corrispondono agli orari attuali del corso
 */
export async function cleanupOrphanSessions(courseId: string): Promise<number> {
  try {
    console.log('🧹 Pulizia sessioni orfane per corso:', courseId);
    
    // Ottieni gli orari attuali del corso
    const { data: schedules, error: schedulesError } = await supabase
      .from('course_schedules')
      .select('day_of_week, start_time, end_time')
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (schedulesError) {
      console.error('Errore nel recupero degli orari:', schedulesError);
      return 0;
    }

    if (!schedules || schedules.length === 0) {
      console.log('⚠️ Nessun orario trovato per il corso');
      return 0;
    }

    // Ottieni tutte le sessioni future
    const { data: sessions, error: sessionsError } = await supabase
      .from('course_sessions')
      .select('*')
      .eq('course_id', courseId)
      .gte('session_date', new Date().toISOString().split('T')[0]);

    if (sessionsError) {
      console.error('Errore nel recupero delle sessioni:', sessionsError);
      return 0;
    }

    if (!sessions || sessions.length === 0) {
      console.log('ℹ️ Nessuna sessione futura trovata');
      return 0;
    }

    console.log(`📊 Trovate ${sessions.length} sessioni future da verificare`);

    // Identifica sessioni orfane
    const orphanSessionIds: string[] = [];
    
    for (const session of sessions) {
      const sessionDate = new Date(session.session_date);
      const dayOfWeek = sessionDate.getDay();
      
      // Verifica se esiste un orario per questo giorno e ora
      const matchingSchedule = schedules.find(schedule => 
        schedule.day_of_week === dayOfWeek &&
        schedule.start_time === session.start_time &&
        schedule.end_time === session.end_time
      );

      if (!matchingSchedule) {
        console.log(`🗑️ Sessione orfana trovata: ${session.session_date} ${session.start_time}-${session.end_time}`);
        orphanSessionIds.push(session.id);
      }
    }

    if (orphanSessionIds.length === 0) {
      console.log('✅ Nessuna sessione orfana trovata');
      return 0;
    }

    console.log(`🧹 Eliminazione di ${orphanSessionIds.length} sessioni orfane`);

    // Elimina le sessioni orfane
    const { error: deleteError } = await supabase
      .from('course_sessions')
      .delete()
      .in('id', orphanSessionIds);

    if (deleteError) {
      console.error('Errore nell\'eliminazione delle sessioni orfane:', deleteError);
      return 0;
    }

    console.log(`✅ Eliminate ${orphanSessionIds.length} sessioni orfane`);
    return orphanSessionIds.length;

  } catch (error) {
    console.error('Errore nella pulizia delle sessioni orfane:', error);
    return 0;
  }
}

/**
 * Regenera automaticamente le sessioni future di un corso dopo la modifica degli orari
 * ELIMINA TUTTE le sessioni future dalla data corrente e le rigenera con i nuovi orari
 */
export async function regenerateCourseSessions(
  courseId: string,
  endDate?: Date
): Promise<SessionRegenerationResult> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const warnings: string[] = [];
    
    console.log('🔄 Inizio rigenerazione sessioni per corso:', courseId);

    // 1. Prima di tutto, pulisci le sessioni orfane
    const orphanSessionsDeleted = await cleanupOrphanSessions(courseId);
    if (orphanSessionsDeleted > 0) {
      warnings.push(`Eliminate ${orphanSessionsDeleted} sessioni orfane che non corrispondevano agli orari attuali`);
    }

    // 2. Conta le prenotazioni confermate che verranno perse
    const { data: affectedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('course_id', courseId)
      .eq('status', 'confirmed')
      .gte('scheduled_date', today);

    if (bookingsError) {
      console.error('Errore nel conteggio delle prenotazioni:', bookingsError);
    }

    const bookingsCount = affectedBookings?.length || 0;
    if (bookingsCount > 0) {
      warnings.push(`Attenzione: ${bookingsCount} prenotazioni confermate potrebbero essere influenzate da questa modifica`);
    }

    // 3. Conta le sessioni che verranno eliminate
    const { count: sessionsToDelete } = await supabase
      .from('course_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .gte('session_date', today);

    console.log(`📊 Sessioni da eliminare: ${sessionsToDelete || 0}`);

    // 4. ELIMINA TUTTE le sessioni future (non solo quelle senza prenotazioni)
    const { error: deleteError } = await supabase
      .from('course_sessions')
      .delete()
      .eq('course_id', courseId)
      .gte('session_date', today);

    if (deleteError) {
      console.error('Errore nell\'eliminazione delle sessioni:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Eliminate ${sessionsToDelete || 0} sessioni future`);

    // 5. Rigenera le sessioni usando la nuova funzione con durata
    console.log(`🔄 Rigenerazione sessioni con durata automatica dal ${today}`);

    const { data: generatedCount, error: generateError } = await supabase
      .rpc('generate_course_sessions_with_duration', {
        _course_id: courseId,
        _start_date: today
      });

    if (generateError) {
      console.error('Errore nella rigenerazione:', generateError);
      throw generateError;
    }

    console.log(`✅ Generate ${generatedCount || 0} nuove sessioni`);

    // 6. Se ci sono prenotazioni influenzate, cerca di riassegnarle alle nuove sessioni compatibili
    if (bookingsCount > 0) {
      await handleAffectedBookings(courseId, affectedBookings || []);
    }

    const message = `Sessioni aggiornate con successo: ${sessionsToDelete || 0} eliminate, ${generatedCount || 0} rigenerate`;
    
    return {
      deletedSessions: sessionsToDelete || 0,
      createdSessions: generatedCount || 0,
      affectedBookings: bookingsCount,
      deletedOrphanSessions: orphanSessionsDeleted,
      success: true,
      message,
      warnings
    };

  } catch (error) {
    console.error('❌ Errore nella rigenerazione delle sessioni:', error);
    return {
      deletedSessions: 0,
      createdSessions: 0,
      affectedBookings: 0,
      deletedOrphanSessions: 0,
      success: false,
      message: `Errore nella rigenerazione delle sessioni: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
      warnings: []
    };
  }
}

/**
 * Gestisce le prenotazioni influenzate dalla rigenerazione delle sessioni
 */
async function handleAffectedBookings(courseId: string, bookings: any[]) {
  console.log(`🔄 Gestione di ${bookings.length} prenotazioni influenzate`);
  
  for (const booking of bookings) {
    try {
      // Cerca una nuova sessione compatibile
      const { data: newSessions, error } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseId)
        .eq('session_date', booking.scheduled_date)
        .eq('start_time', booking.scheduled_time)
        .gt('available_spots', 0)
        .limit(1);

      if (error) {
        console.error('Errore nella ricerca di sessioni compatibili:', error);
        continue;
      }

      if (newSessions && newSessions.length > 0) {
        // Aggiorna la prenotazione con la nuova sessione
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ session_id: newSessions[0].id })
          .eq('id', booking.id);

        if (!updateError) {
          console.log(`✅ Prenotazione ${booking.id} riassegnata alla nuova sessione`);
        } else {
          console.error('Errore nel riassegnare la prenotazione:', updateError);
        }
      } else {
        console.log(`⚠️ Nessuna sessione compatibile trovata per la prenotazione ${booking.id}`);
      }
    } catch (error) {
      console.error('Errore nella gestione della prenotazione:', booking.id, error);
    }
  }
}