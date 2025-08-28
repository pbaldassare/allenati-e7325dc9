import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CourseScheduleManager } from '@/components/admin/CourseScheduleManager';
import { useToast } from '@/hooks/use-toast';

const OwnerCourseSchedules = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymRooms, setGymRooms] = useState<any[]>([]);

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
      // Delete existing schedules
      await supabase
        .from('course_schedules')
        .delete()
        .eq('course_id', id);

      // Insert new schedules
      if (schedules.length > 0) {
        const schedulesToInsert = schedules.map(schedule => ({
          course_id: id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          room_id: schedule.room_id,
          room_name: schedule.room_name,
        }));

        const { error } = await supabase
          .from('course_schedules')
          .insert(schedulesToInsert);

        if (error) throw error;
      }

      toast({
        title: 'Successo',
        description: 'Orari corso aggiornati con successo',
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
          <CourseScheduleManager
            schedule={course.course_schedules || []}
            onChange={handleScheduleChange}
            gymRooms={gymRooms}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerCourseSchedules;