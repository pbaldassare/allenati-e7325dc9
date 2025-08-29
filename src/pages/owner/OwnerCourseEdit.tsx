import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OwnerCourseForm } from '@/components/owner/OwnerCourseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Calendar, Clock, Ban } from 'lucide-react';
import { SupabaseCourse } from '@/types/course';
import { CourseScheduleManager } from '@/components/admin/CourseScheduleManager';
import { CourseSessionManager } from '@/components/admin/CourseSessionManager';
import { CourseScheduleExceptions } from '@/components/owner/CourseScheduleExceptions';
import { useToast } from '@/hooks/use-toast';

const OwnerCourseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymRooms, setGymRooms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);

  const handleBack = () => {
    // Smart navigation for owner pages
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/owner/courses');
    }
  };

  useEffect(() => {
    const loadCourse = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // First, get the course data
        const courseResult = await supabase
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
            ),
            course_categories (
              name
            ),
            instructors (
              id,
              user_id
            )
          `)
          .eq('id', id)
          .single();

        if (courseResult.error) throw courseResult.error;
        
        // Then load related data using the course's gym_id
        const [roomsResult, sessionsResult, exceptionsResult] = await Promise.all([
          // Gym rooms
          supabase
            .from('gym_rooms')
            .select('id, name, description, color')
            .eq('gym_id', courseResult.data.gym_id)
            .eq('is_active', true),
          
          // Course sessions
          supabase
            .from('course_sessions')
            .select('*')
            .eq('course_id', id)
            .order('session_date', { ascending: true }),
          
          // Course exceptions
          supabase
            .from('course_schedule_exceptions')
            .select('*')
            .eq('course_id', id)
            .order('start_date', { ascending: true })
        ]);

        const courseData = courseResult.data;

        // Get instructor profile if exists
        let instructorProfile = null;
        if (courseData.instructors?.user_id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', courseData.instructors.user_id)
            .single();

          if (!profileError && profileData) {
            instructorProfile = profileData;
          }
        }
        
        // Map course data
        const mappedCourse = {
          ...courseData,
          schedules: courseData.course_schedules || [],
          instructors: courseData.instructors ? {
            ...courseData.instructors,
            profiles: instructorProfile
          } : null
        };
        
        setCourse(mappedCourse);
        setGymRooms(roomsResult.data || []);
        setSessions(sessionsResult.data || []);
        setExceptions((exceptionsResult.data || []).map(exc => ({
          ...exc,
          start_date: new Date(exc.start_date),
          end_date: new Date(exc.end_date)
        })));
        
      } catch (err) {
        console.error('Error loading course:', err);
        setError('Errore nel caricamento del corso');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Caricamento corso...</p>
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

  // Handle schedule changes
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
        const schedulesToInsert = newSchedules.map(schedule => ({
          course_id: id,
          day_of_week: schedule.dayOfWeek,
          start_time: schedule.time,
          end_time: addHoursToTime(schedule.time, course?.duration_minutes || 60),
          room_id: schedule.roomId,
          room_name: gymRooms.find(r => r.id === schedule.roomId)?.name
        }));
        
        await supabase
          .from('course_schedules')
          .insert(schedulesToInsert);
      }
      
      toast({
        title: "Successo",
        description: "Orari aggiornati con successo",
      });
    } catch (error) {
      console.error('Error updating schedules:', error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento degli orari",
        variant: "destructive",
      });
    }
  };

  // Handle sessions changes
  const handleSessionsChange = async (newSessions: any[]) => {
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
        title: "Sessioni salvate",
        description: `${newSessions.length} sessioni salvate nel database`,
      });
    } catch (error) {
      console.error('Error saving sessions:', error);
      toast({
        title: "Errore",
        description: "Errore durante il salvataggio delle sessioni",
        variant: "destructive",
      });
    }
  };

  // Handle exceptions changes
  const handleExceptionsChange = async (newExceptions: any[]) => {
    if (!id) return;
    
    try {
      // Delete existing exceptions
      await supabase
        .from('course_schedule_exceptions')
        .delete()
        .eq('course_id', id);
      
      // Insert new exceptions
      if (newExceptions.length > 0) {
        const exceptionsToInsert = newExceptions.map(exception => ({
          course_id: id,
          start_date: exception.start_date.toISOString().split('T')[0],
          end_date: exception.end_date.toISOString().split('T')[0],
          reason: exception.reason
        }));
        
        await supabase
          .from('course_schedule_exceptions')
          .insert(exceptionsToInsert);
      }
      
      setExceptions(newExceptions);
      toast({
        title: "Successo",
        description: "Eccezioni aggiornate con successo",
      });
    } catch (error) {
      console.error('Error updating exceptions:', error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento delle eccezioni",
        variant: "destructive",
      });
    }
  };

  // Helper function to add hours to time
  const addHoursToTime = (time: string, minutes: number) => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Modifica Corso
          </h1>
          <p className="text-muted-foreground">
            Gestione completa del corso "{course.name}"
          </p>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Informazioni
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Orari
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sessioni
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Eccezioni
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Corso</CardTitle>
              <CardDescription>
                Modifica i dettagli di base del corso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OwnerCourseForm mode="edit" course={course as any} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Orari Settimanali</CardTitle>
              <CardDescription>
                Configura gli orari ricorrenti del corso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseScheduleManager
                schedule={course?.schedules?.map(s => ({
                  dayOfWeek: s.day_of_week,
                  time: s.start_time,
                  roomId: s.room_id || '',
                  day: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][s.day_of_week]
                })) || []}
                onChange={handleScheduleChange}
                gymRooms={gymRooms}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Sessioni</CardTitle>
              <CardDescription>
                Genera e gestisci le sessioni individuali del corso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseSessionManager
                courseId={id}
                startDate={course?.start_date ? new Date(course.start_date) : undefined}
                endDate={course?.end_date ? new Date(course.end_date) : undefined}
                schedules={course?.schedules?.map(s => ({
                  day_of_week: s.day_of_week,
                  start_time: s.start_time,
                  end_time: s.end_time,
                  room_id: s.room_id,
                  room_name: s.room_name
                })) || []}
                maxParticipants={course?.max_participants || 20}
                onSessionsChange={handleSessionsChange}
                initialSessions={sessions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions">
          <Card>
            <CardHeader>
              <CardTitle>Periodi di Esclusione</CardTitle>
              <CardDescription>
                Configura i periodi in cui il corso non si tiene (vacanze, chiusure, ecc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseScheduleExceptions
                exceptions={exceptions}
                onChange={handleExceptionsChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerCourseEdit;