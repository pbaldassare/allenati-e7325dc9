import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowRight, Info, Calendar, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OwnerCourseForm } from '@/components/owner/OwnerCourseForm';
import { CourseScheduleManager } from '@/components/admin/CourseScheduleManager';
import { CourseSessionManager } from '@/components/admin/CourseSessionManager';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { GymRoom } from '@/types/schedule';
import { autoGenerateSessionsIfNeeded } from '@/lib/sessionGenerator';

interface CourseBasicData {
  id: string;
  name: string;
  description: string;
  category_id: string;
  instructor_id: string;
  max_participants: number;
  duration_minutes: number;
  difficulty_level: number;
  price_per_session: number;
  credits_required: number;
  equipment_needed?: string;
  image_url?: string;
  deadline_hours: number;
  reserved_spots: number;
  is_active: boolean;
  start_date: Date;
  end_date: Date;
}

const OwnerCourseNew: React.FC = () => {
  const navigate = useNavigate();
  const { selectedGym } = useOwnerGym();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule-sessions'>('basic');
  const [courseData, setCourseData] = useState<CourseBasicData | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [gymRooms, setGymRooms] = useState<GymRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  
  useEffect(() => {
    loadGymRooms();
  }, [selectedGym?.id]);

  const loadGymRooms = async () => {
    if (!selectedGym?.id) {
      setLoadingRooms(false);
      setRoomsError('Nessuna palestra selezionata');
      return;
    }
    
    setLoadingRooms(true);
    setRoomsError(null);
    
    try {
      const { data, error } = await supabase
        .from('gym_rooms')
        .select('id, name, description, color')
        .eq('gym_id', selectedGym.id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      setGymRooms(data || []);
      
      if (!data || data.length === 0) {
        setRoomsError('Nessuna sala configurata per questa palestra');
      }
    } catch (error) {
      console.error('Error loading gym rooms:', error);
      setRoomsError('Errore nel caricamento delle sale');
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le sale della palestra',
        variant: 'destructive',
      });
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleCourseCreated = (data: CourseBasicData) => {
    console.log('Course created with data:', data);
    setCourseData(data);
    setActiveTab('schedule-sessions');
  };

  const handleSchedulesChange = (newSchedules: any[]) => {
    console.log('Schedules updated:', newSchedules);
    setSchedules(newSchedules);
  };

  const handleSessionsChange = (newSessions: any[]) => {
    console.log('Sessions updated:', newSessions);
    setSessions(newSessions);
  };

  const handleFinalizeCourse = async () => {
    if (!courseData?.id) {
      toast({
        title: 'Errore',
        description: 'Corso non creato correttamente',
        variant: 'destructive',
      });
      return;
    }

    if (schedules.length === 0) {
      toast({
        title: 'Errore',
        description: 'Aggiungi almeno un orario settimanale',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Saving schedules for course:', courseData.id);
      
      // Step 1: Save schedules with new override fields
      const schedulesWithCourseId = schedules.map(schedule => ({
        course_id: courseData.id,
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.time,
        end_time: schedule.end_time,
        room_id: schedule.roomId,
        room_name: gymRooms.find(r => r.id === schedule.roomId)?.name || null,
        max_participants_override: schedule.maxParticipantsOverride || null,
        difficulty_level_override: schedule.difficultyLevelOverride || null,
        is_active: true
      }));

      const { error: schedulesError } = await supabase
        .from('course_schedules')
        .insert(schedulesWithCourseId);

      if (schedulesError) {
        console.error('Error saving schedules:', schedulesError);
        throw new Error('Errore nel salvataggio degli orari');
      }

      // Step 2: Save sessions if manually added
      if (sessions.length > 0) {
        console.log('Saving manual sessions:', sessions);
        
        const sessionsWithCourseId = sessions.map(session => ({
          course_id: courseData.id,
          session_date: session.session_date,
          start_time: session.start_time,
          end_time: session.end_time,
          room_id: session.room_id,
          room_name: session.room_name,
          max_participants: courseData.max_participants,
          available_spots: courseData.max_participants,
          status: 'scheduled'
        }));

        const { error: sessionsError } = await supabase
          .from('course_sessions')
          .insert(sessionsWithCourseId);

        if (sessionsError) {
          console.error('Error saving sessions:', sessionsError);
          throw new Error('Errore nel salvataggio delle sessioni');
        }
      }

      // Step 3: Trigger automatic session generation
      console.log('Triggering automatic session generation');
      const generated = await autoGenerateSessionsIfNeeded(courseData.id);

      // Step 4: Attiva il corso (creato come inattivo durante step 1).
      // Ora che ci sono orari con sala il trigger DB consente l'attivazione.
      if (courseData.is_active !== false) {
        const { error: activateError } = await supabase
          .from('courses')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', courseData.id);
        if (activateError) {
          console.error('Error activating course:', activateError);
          toast({
            title: 'Attenzione',
            description:
              'Corso creato ma non attivato: verifica che almeno un orario abbia una sala assegnata.',
            variant: 'destructive',
          });
          return;
        }
      }

      if (generated) {
        toast({
          title: 'Successo',
          description: 'Corso creato e sessioni generate automaticamente',
        });
      } else {
        toast({
          title: 'Successo',
          description: 'Corso creato correttamente',
        });
      }

      navigate('/owner/courses');
    } catch (error) {
      console.error('Error finalizing course:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore nel completare la configurazione del corso',
        variant: 'destructive',
      });
    }
  };

  const getTabStatus = (tab: 'basic' | 'schedule-sessions') => {
    if (tab === 'basic') return 'current';
    if (!courseData) return 'disabled';
    if (tab === 'schedule-sessions') return activeTab === 'schedule-sessions' ? 'current' : 'completed';
    return 'disabled';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Nuovo Corso
        </h1>
        <p className="text-muted-foreground">
          Crea un nuovo corso in 2 semplici passaggi
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="basic" 
                disabled={getTabStatus('basic') === 'disabled'}
                className={cn(
                  getTabStatus('basic') === 'completed' && 'bg-primary/10'
                )}
              >
                <div className="flex items-center gap-2">
                  {getTabStatus('basic') === 'completed' && <Check className="h-4 w-4 text-primary" />}
                  <Info className="h-4 w-4" />
                  <span>Informazioni Base</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="schedule-sessions" 
                disabled={getTabStatus('schedule-sessions') === 'disabled'}
                className={cn(
                  getTabStatus('schedule-sessions') === 'completed' && 'bg-primary/10'
                )}
              >
                <div className="flex items-center gap-2">
                  {getTabStatus('schedule-sessions') === 'completed' && <Check className="h-4 w-4 text-primary" />}
                  <Calendar className="h-4 w-4" />
                  <span>Orari e Sessioni</span>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-6">
              <OwnerCourseForm 
                mode="create" 
                onCourseCreated={handleCourseCreated}
              />
            </TabsContent>

            <TabsContent value="schedule-sessions" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Orari Settimanali</CardTitle>
                  <CardDescription>
                    Configura gli orari ricorrenti per questo corso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingRooms ? (
                    <div className="text-center py-8">Caricamento sale...</div>
                  ) : roomsError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Errore</AlertTitle>
                      <AlertDescription>{roomsError}</AlertDescription>
                    </Alert>
                  ) : (
                    <CourseScheduleManager
                      schedule={schedules}
                      onChange={handleSchedulesChange}
                      gymRooms={gymRooms}
                      courseMaxParticipants={courseData?.max_participants}
                      courseDifficultyLevel={courseData?.difficulty_level}
                    />
                  )}
                </CardContent>
              </Card>

              {schedules.length > 0 && courseData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Anteprima Sessioni</CardTitle>
                    <CardDescription>
                      Sessioni che verranno generate in base agli orari configurati
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CourseSessionManager
                      courseId={courseData.id}
                      schedules={schedules.map(s => ({
                        day_of_week: s.dayOfWeek,
                        start_time: s.time,
                        end_time: s.end_time,
                        room_id: s.roomId,
                        room_name: gymRooms.find(r => r.id === s.roomId)?.name
                      }))}
                      maxParticipants={courseData.max_participants}
                      onSessionsChange={handleSessionsChange}
                      startDate={new Date(courseData.start_date)}
                      endDate={new Date(courseData.end_date)}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('basic')}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Indietro
                    </Button>

                    <Button
                      onClick={handleFinalizeCourse}
                      disabled={!courseData || schedules.length === 0}
                      className="bg-gradient-primary hover:opacity-90"
                    >
                      Completa Corso
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerCourseNew;
