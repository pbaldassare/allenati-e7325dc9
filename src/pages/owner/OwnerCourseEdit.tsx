import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OwnerCourseForm } from '@/components/owner/OwnerCourseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Calendar, Clock, Ban, Plus } from 'lucide-react';
import { SupabaseCourse } from '@/types/course';
import { CourseScheduleManager } from '@/components/admin/CourseScheduleManager';
import { CourseSessionManager } from '@/components/admin/CourseSessionManager';

import { useToast } from '@/hooks/use-toast';
import { WeeksSelector } from '@/components/ui/weeks-selector';
import { AddPeriodDialog } from '@/components/owner/AddPeriodDialog';

const OwnerCourseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymRooms, setGymRooms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showAddPeriodDialog, setShowAddPeriodDialog] = useState(false);
  
  const [durationWeeks, setDurationWeeks] = useState(12);

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
              room_name,
              max_participants_override,
              difficulty_level_override
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
        const [roomsResult, sessionsResult] = await Promise.all([
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
            .order('session_date', { ascending: true })
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
        setDurationWeeks(mappedCourse.duration_weeks || 12);
        
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

  // Handle schedule changes with smart session management
  const handleScheduleChange = async (newSchedules: any[]) => {
    if (!id) return;
    
    try {
      // Get current schedules before making changes
      const { data: currentSchedules } = await supabase
        .from('course_schedules')
        .select('*')
        .eq('course_id', id);

      // Use smart update that only affects changed schedules
      const { smartUpdateCourseSchedules, getScheduleChangeSummary } = await import('@/lib/smartSessionManager');
      
      // Prepare new schedules with proper format
      const formattedNewSchedules = newSchedules.map(schedule => ({
        dayOfWeek: schedule.dayOfWeek,
        time: schedule.time,
        end_time: schedule.end_time || addHoursToTime(schedule.time, course?.duration_minutes || 60),
        roomId: schedule.roomId,
        room_name: gymRooms.find(r => r.id === schedule.roomId)?.name,
        maxParticipantsOverride: schedule.maxParticipantsOverride,
        difficultyLevelOverride: schedule.difficultyLevelOverride
      }));

      const comparison = await smartUpdateCourseSchedules(id, formattedNewSchedules, currentSchedules || [], durationWeeks);
      
      const summary = getScheduleChangeSummary(comparison);
      
      // Signal to other components that sessions have been updated
      localStorage.setItem('sessions_updated_at', Date.now().toString());
      
      toast({
        title: "Orari aggiornati con successo",
        description: summary || "Nessuna modifica rilevata",
        duration: comparison.affectedBookings > 0 ? 10000 : 5000,
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

  // Handle duration weeks change
  const handleDurationWeeksChange = async (weeks: number) => {
    setDurationWeeks(weeks);
    
    try {
      // Update course duration_weeks in database
      await supabase
        .from('courses')
        .update({ duration_weeks: weeks })
        .eq('id', id);
      
      // Update local state
      setCourse(prev => ({ ...prev, duration_weeks: weeks }));
      
      toast({
        title: "Durata aggiornata",
        description: `Corso impostato a ${weeks} settimane`,
      });
    } catch (error) {
      console.error('Error updating duration weeks:', error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento della durata",
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
              <CardTitle className="flex items-center justify-between">
                <span>Orari Settimanali</span>
                <WeeksSelector
                  value={durationWeeks}
                  onChange={handleDurationWeeksChange}
                  className="w-auto"
                />
              </CardTitle>
              <CardDescription>
                Configura gli orari ricorrenti del corso. Il sistema gestisce automaticamente le sessioni future in modo intelligente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseScheduleManager
                schedule={course?.schedules?.map(s => ({
                  dayOfWeek: s.day_of_week,
                  time: s.start_time,
                  end_time: s.end_time,
                  roomId: s.room_id || '',
                  day: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][s.day_of_week],
                  maxParticipantsOverride: s.max_participants_override,
                  difficultyLevelOverride: s.difficulty_level_override
                })) || []}
                onChange={handleScheduleChange}
                gymRooms={gymRooms}
                courseMaxParticipants={course?.max_participants}
                courseDifficultyLevel={course?.difficulty_level}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestione Sessioni</CardTitle>
                  <CardDescription>
                    Genera e gestisci le sessioni individuali del corso
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddPeriodDialog(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi Periodo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CourseSessionManager
                courseId={id}
                startDate={course?.start_date ? new Date(course.start_date) : new Date()}
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
              />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <AddPeriodDialog
        open={showAddPeriodDialog}
        onOpenChange={setShowAddPeriodDialog}
        courseId={id || ''}
        schedules={course?.schedules?.map(s => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          room_id: s.room_id,
          room_name: s.room_name
        })) || []}
        maxParticipants={course?.max_participants || 20}
        currentEndDate={course?.end_date ? new Date(course.end_date) : undefined}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
};

export default OwnerCourseEdit;