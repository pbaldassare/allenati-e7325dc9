import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CourseSessionManager } from '@/components/admin/CourseSessionManager';
import { useToast } from '@/hooks/use-toast';

const OwnerCourseSessions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/owner/courses');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Load course data
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`
            *,
            course_schedules (
              day_of_week,
              start_time,
              end_time,
              room_id,
              room_name
            )
          `)
          .eq('id', id)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Load existing sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('course_sessions')
          .select('*')
          .eq('course_id', id)
          .order('session_date', { ascending: true });

        if (sessionsError) throw sessionsError;
        setSessions(sessionsData || []);
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleSessionsChange = (newSessions: any[]) => {
    setSessions(newSessions);
    toast({
      title: 'Successo',
      description: 'Sessioni corso aggiornate con successo',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Caricamento dati...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">{error || 'Corso non trovato'}</p>
        <Button 
          variant="outline" 
          onClick={() => navigate('/owner/courses')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna ai Corsi
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Sessioni
          </h1>
          <p className="text-muted-foreground">
            Gestisci le sessioni specifiche per "{course.name}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessioni Corso</CardTitle>
          <CardDescription>
            Genera automaticamente o gestisci manualmente le sessioni del corso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseSessionManager
            courseId={course.id}
            startDate={course.start_date ? new Date(course.start_date) : undefined}
            endDate={course.end_date ? new Date(course.end_date) : undefined}
            schedules={course.course_schedules || []}
            maxParticipants={course.max_participants}
            onSessionsChange={handleSessionsChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerCourseSessions;