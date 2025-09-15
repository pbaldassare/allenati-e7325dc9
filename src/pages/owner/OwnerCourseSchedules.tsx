import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CourseScheduleManager } from '@/components/admin/CourseScheduleManager';
import { WeeksSelector } from '@/components/ui/weeks-selector';
import { useToast } from '@/hooks/use-toast';

const OwnerCourseSchedules = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymRooms, setGymRooms] = useState<any[]>([]);
  const [durationWeeks, setDurationWeeks] = useState<number>(12);

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
              id,
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
        setDurationWeeks(courseData.duration_weeks || 12);

        // Load gym rooms
        if (courseData.gym_id) {
          const { data: roomsData, error: roomsError } = await supabase
            .from('gym_rooms')
            .select('id, name')
            .eq('gym_id', courseData.gym_id)
            .eq('is_active', true)
            .order('name');

          if (roomsError) throw roomsError;
          setGymRooms(roomsData || []);
        }
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleScheduleChange = async (schedules: any[]) => {
    if (!id) return;

    try {
      // Get current schedules before making changes
      const { data: currentSchedules } = await supabase
        .from('course_schedules')
        .select('*')
        .eq('course_id', id);

      // Use smart update that only affects changed schedules
      const { smartUpdateCourseSchedules, getScheduleChangeSummary } = await import('@/lib/smartSessionManager');
      
      const comparison = await smartUpdateCourseSchedules(id, schedules, currentSchedules || [], durationWeeks);
      
      const summary = getScheduleChangeSummary(comparison);
      
      toast({
        title: 'Orari e sessioni aggiornati intelligentemente',
        description: summary || "Nessuna modifica rilevata",
        duration: comparison.affectedBookings > 0 ? 10000 : 5000,
      });
    } catch (error) {
      console.error('Error updating schedules:', error);
      toast({
        title: 'Errore',
        description: 'Errore nell\'aggiornamento degli orari',
        variant: 'destructive',
      });
    }
  };

  const handleDurationWeeksChange = async (weeks: number) => {
    setDurationWeeks(weeks);
    if (!id) return;

    try {
      // Update course duration_weeks in database
      const { error } = await supabase
        .from('courses')
        .update({ duration_weeks: weeks })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Durata corso aggiornata',
        description: `Il corso ora ha una durata di ${weeks} settimane`,
      });
    } catch (error) {
      console.error('Error updating course duration:', error);
      toast({
        title: 'Errore',
        description: 'Errore nell\'aggiornamento della durata',
        variant: 'destructive',
      });
    }
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Orari
          </h1>
          <p className="text-muted-foreground">
            Configura gli orari settimanali per "{course.name}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orari Settimanali</CardTitle>
          <CardDescription>
            Imposta i giorni e gli orari in cui si svolge il corso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                ⚠️ <strong>Nota importante:</strong> Modificando gli orari, le sessioni future verranno automaticamente rigenterate per il periodo specificato. Le prenotazioni esistenti saranno riassegnate quando possibile.
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <WeeksSelector
                value={durationWeeks}
                onChange={handleDurationWeeksChange}
                startDate={course?.start_date ? new Date(course.start_date) : new Date()}
              />
            </div>
            
            <CourseScheduleManager
              schedule={course.course_schedules || []}
              onChange={handleScheduleChange}
              gymRooms={gymRooms}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerCourseSchedules;