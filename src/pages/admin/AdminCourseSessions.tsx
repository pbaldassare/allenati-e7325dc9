import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CourseSessionManager } from '@/components/admin/CourseSessionManager';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CourseSession {
  id?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_id?: string;
  room_name?: string;
  max_participants: number;
  available_spots: number;
  status: 'scheduled' | 'cancelled' | 'completed';
}

const AdminCourseSessions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, name, max_participants, start_date, end_date')
          .eq('id', id)
          .single();

        if (courseError) throw courseError;

        // Fetch course schedules
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('course_schedules')
          .select('*')
          .eq('course_id', id)
          .eq('is_active', true);

        if (schedulesError) throw schedulesError;

        // Fetch existing sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('course_sessions')
          .select('*')
          .eq('course_id', id)
          .order('session_date', { ascending: true });

        if (sessionsError) throw sessionsError;

        setCourse(courseData);
        setSchedules(schedulesData || []);
        setSessions(sessionsData?.map(session => ({
          ...session,
          status: session.status as 'scheduled' | 'cancelled' | 'completed'
        })) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Errore',
          description: 'Errore nel caricamento dei dati',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  const handleSessionsChange = async (newSessions: CourseSession[]) => {
    if (!id) return;

    try {
      // Delete existing sessions
      await supabase
        .from('course_sessions')
        .delete()
        .eq('course_id', id);

      // Insert new sessions
      if (newSessions.length > 0) {
        const { error } = await supabase
          .from('course_sessions')
          .insert(newSessions.map(session => ({
            course_id: id,
            session_date: session.session_date,
            start_time: session.start_time,
            end_time: session.end_time,
            room_id: session.room_id,
            room_name: session.room_name,
            max_participants: session.max_participants,
            available_spots: session.available_spots,
            status: session.status
          })));

        if (error) throw error;
      }

      setSessions(newSessions);
      toast({
        title: 'Sessioni aggiornate',
        description: 'Le sessioni del corso sono state aggiornate con successo'
      });
    } catch (error) {
      console.error('Error updating sessions:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante l\'aggiornamento delle sessioni',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  if (!course) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Corso non trovato</p>
        <Button onClick={() => navigate('/admin/courses')} className="mt-4">
          Torna alla lista corsi
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/courses/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al corso
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Sessioni del Corso
          </h1>
          <p className="text-muted-foreground">
            Gestisci le sessioni individuali per "{course.name}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestione Sessioni</CardTitle>
          <CardDescription>
            Genera e modifica le sessioni individuali del corso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseSessionManager
            courseId={id}
            schedules={schedules}
            maxParticipants={course.max_participants}
            startDate={course.start_date ? new Date(course.start_date) : undefined}
            endDate={course.end_date ? new Date(course.end_date) : undefined}
            onSessionsChange={handleSessionsChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCourseSessions;