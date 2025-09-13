import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CourseScheduleManager } from '@/components/admin/CourseScheduleManager';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GymRoom {
  id: string;
  name: string;
}

const AdminCourseSchedules = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [gymRooms, setGymRooms] = useState<GymRoom[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, name')
          .eq('id', id)
          .single();

        if (courseError) throw courseError;

        // Fetch gym rooms
        const { data: roomsData, error: roomsError } = await supabase
          .from('gym_rooms')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (roomsError) throw roomsError;

        // Fetch existing schedules
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('course_schedules')
          .select('*')
          .eq('course_id', id)
          .eq('is_active', true);

        if (schedulesError) throw schedulesError;

        setCourse(courseData);
        setGymRooms(roomsData || []);
        setSchedules(schedulesData || []);
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

  const handleScheduleChange = async (newSchedules: any[]) => {
    if (!id) return;

    try {
      // Delete existing schedules
      await supabase
        .from('course_schedules')
        .delete()
        .eq('course_id', id);

      // Insert new schedules
      if (newSchedules.length > 0) {
        const { error } = await supabase
          .from('course_schedules')
          .insert(newSchedules.map(schedule => ({
            course_id: id,
            day_of_week: schedule.dayOfWeek,
            start_time: schedule.time,
            end_time: schedule.endTime,
            room_id: schedule.roomId
          })));

        if (error) throw error;
      }

      // Rigenera automaticamente le sessioni future
      const { regenerateCourseSessions } = await import('@/lib/sessionRegenerator');
      const result = await regenerateCourseSessions(id);

      setSchedules(newSchedules);
      
      if (result.success) {
        let description = result.message;
        
        // Aggiungi informazioni aggiuntive
        if (result.orphanSessionsDeleted > 0) {
          description += ` (${result.orphanSessionsDeleted} sessioni orfane eliminate)`;
        }
        if (result.affectedBookings > 0) {
          description += ` - ${result.affectedBookings} prenotazioni riassegnate`;
        }
        
        // Aggiungi avvisi se presenti
        if (result.warnings && result.warnings.length > 0) {
          description += '\n\n⚠️ ' + result.warnings.join('\n⚠️ ');
        }

        toast({
          title: 'Orari e sessioni aggiornati',
          description,
          duration: result.warnings && result.warnings.length > 0 ? 10000 : 5000,
        });
      } else {
        toast({
          title: 'Errore nella rigenerazione',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating schedules:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante l\'aggiornamento degli orari',
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/courses/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al corso
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Orari del Corso
          </h1>
          <p className="text-muted-foreground">
            Gestisci gli orari settimanali per "{course.name}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestione Orari</CardTitle>
          <CardDescription>
            Configura i giorni e gli orari settimanali ricorrenti del corso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                ⚠️ <strong>Nota importante:</strong> Modificando gli orari, TUTTE le sessioni future dalla data odierna verranno eliminate e rigenerate con i nuovi orari. Le prenotazioni esistenti saranno automaticamente riassegnate alle nuove sessioni compatibili quando possibile.
              </p>
            </div>
            <CourseScheduleManager
              schedule={schedules}
              onChange={handleScheduleChange}
              gymRooms={gymRooms}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCourseSchedules;