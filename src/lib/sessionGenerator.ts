import { supabase } from '@/integrations/supabase/client';

export interface CourseSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id?: string;
  room_name?: string;
}

export interface CourseSession {
  course_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_id?: string;
  room_name?: string;
  max_participants: number;
  available_spots: number;
  status: 'scheduled' | 'cancelled' | 'completed';
}

/**
 * Genera sessioni per un corso basandosi sui suoi schedules e date
 */
export async function generateSessionsForCourse(
  courseId: string,
  startDate: Date,
  endDate: Date,
  schedules: CourseSchedule[],
  maxParticipants: number
): Promise<CourseSession[]> {
  const sessions: CourseSession[] = [];
  
  // Per ogni schedule, genera le sessioni ricorrenti
  for (const schedule of schedules) {
    let currentDate = new Date(startDate);
    
    // Trova il primo giorno che corrisponde al day_of_week
    while (currentDate.getDay() !== schedule.day_of_week && currentDate <= endDate) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Genera sessioni settimanali
    while (currentDate <= endDate) {
      // Controlla se esiste già una eccezione per questa data
      const { data: exceptions } = await supabase
        .from('course_schedule_exceptions')
        .select('*')
        .eq('course_id', courseId)
        .lte('start_date', currentDate.toISOString().split('T')[0])
        .gte('end_date', currentDate.toISOString().split('T')[0]);
      
      // Se non ci sono eccezioni, crea la sessione
      if (!exceptions || exceptions.length === 0) {
        sessions.push({
          course_id: courseId,
          session_date: currentDate.toISOString().split('T')[0],
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          room_id: schedule.room_id,
          room_name: schedule.room_name,
          max_participants: maxParticipants,
          available_spots: maxParticipants,
          status: 'scheduled'
        });
      }
      
      // Passa alla settimana successiva
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }
  
  return sessions;
}

/**
 * Salva le sessioni generate nel database
 */
export async function saveGeneratedSessions(
  courseId: string,
  sessions: CourseSession[]
): Promise<boolean> {
  try {
    // Prima elimina le sessioni esistenti
    const { error: deleteError } = await supabase
      .from('course_sessions')
      .delete()
      .eq('course_id', courseId);
    
    if (deleteError) {
      console.error('Error deleting existing sessions:', deleteError);
      return false;
    }
    
    // Poi inserisce le nuove sessioni
    if (sessions.length > 0) {
      const { error: insertError } = await supabase
        .from('course_sessions')
        .insert(sessions);
      
      if (insertError) {
        console.error('Error inserting new sessions:', insertError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error saving sessions:', error);
    return false;
  }
}

/**
 * Genera automaticamente sessioni per un corso se configurato per farlo
 */
export async function autoGenerateSessionsIfNeeded(courseId: string): Promise<boolean> {
  try {
    // Recupera i dati del corso
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        auto_generate_sessions,
        start_date,
        end_date,
        max_participants,
        course_schedules (
          day_of_week,
          start_time,
          end_time,
          room_id,
          room_name
        )
      `)
      .eq('id', courseId)
      .single();
    
    if (courseError || !course) {
      console.error('Error fetching course:', courseError);
      return false;
    }
    
    // Controlla se deve generare automaticamente
    if (!course.auto_generate_sessions || !course.start_date || !course.end_date) {
      return true; // Non è un errore, semplicemente non deve generare
    }
    
    // Controlla se ha schedules
    if (!course.course_schedules || course.course_schedules.length === 0) {
      console.log('Course has no schedules, skipping session generation');
      return true;
    }
    
    // Genera le sessioni
    const sessions = await generateSessionsForCourse(
      courseId,
      new Date(course.start_date),
      new Date(course.end_date),
      course.course_schedules,
      course.max_participants
    );
    
    // Salva le sessioni
    return await saveGeneratedSessions(courseId, sessions);
    
  } catch (error) {
    console.error('Error in autoGenerateSessionsIfNeeded:', error);
    return false;
  }
}

/**
 * Funzione per riparare i corsi esistenti che non hanno sessioni
 */
export async function repairCoursesWithoutSessions(): Promise<{ repaired: number; errors: string[] }> {
  const errors: string[] = [];
  let repaired = 0;
  
  try {
    // Trova tutti i corsi attivi che hanno auto_generate_sessions = true ma nessuna sessione
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        auto_generate_sessions,
        start_date,
        end_date,
        max_participants,
        course_schedules (
          day_of_week,
          start_time,
          end_time,
          room_id,
          room_name
        )
      `)
      .eq('is_active', true)
      .eq('auto_generate_sessions', true)
      .not('start_date', 'is', null)
      .not('end_date', 'is', null);
    
    if (coursesError) {
      errors.push(`Error fetching courses: ${coursesError.message}`);
      return { repaired: 0, errors };
    }
    
    // Per ogni corso, controlla se ha sessioni
    for (const course of courses || []) {
      try {
        const { data: existingSessions, error: sessionsError } = await supabase
          .from('course_sessions')
          .select('id')
          .eq('course_id', course.id);
        
        if (sessionsError) {
          errors.push(`Error checking sessions for course ${course.name}: ${sessionsError.message}`);
          continue;
        }
        
        // Se non ha sessioni e ha schedules, genera le sessioni
        if ((!existingSessions || existingSessions.length === 0) && 
            course.course_schedules && course.course_schedules.length > 0) {
          
          const success = await autoGenerateSessionsIfNeeded(course.id);
          if (success) {
            repaired++;
            console.log(`Generated sessions for course: ${course.name}`);
          } else {
            errors.push(`Failed to generate sessions for course: ${course.name}`);
          }
        }
        
      } catch (error) {
        errors.push(`Error processing course ${course.name}: ${error}`);
      }
    }
    
  } catch (error) {
    errors.push(`Global error: ${error}`);
  }
  
  return { repaired, errors };
}