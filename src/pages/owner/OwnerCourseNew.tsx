import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Info, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { OwnerCourseForm } from '@/components/owner/OwnerCourseForm';
import { CourseScheduleManager } from '@/components/admin/CourseScheduleManager';
import { CourseSessionManager } from '@/components/admin/CourseSessionManager';
import { CourseScheduleExceptions } from '@/components/owner/CourseScheduleExceptions';
import { supabase } from '@/integrations/supabase/client';
import { useGym } from '@/contexts/GymContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { ScheduleItem, GymRoom, CourseSession } from '@/types/schedule';

interface CourseBasicData {
  id?: string;
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


interface ScheduleException {
  start_date: Date;
  end_date: Date;
  reason?: string;
}

const OwnerCourseNew: React.FC = () => {
  const navigate = useNavigate();
  const { selectedGym } = useGym();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('basic');
  const [courseData, setCourseData] = useState<CourseBasicData | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [gymRooms, setGymRooms] = useState<GymRoom[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    document.title = "Nuovo Corso | Area Proprietario";
    loadGymRooms();
  }, []);

  const loadGymRooms = async () => {
    if (!selectedGym?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('gym_rooms')
        .select('id, name')
        .eq('gym_id', selectedGym.id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setGymRooms(data || []);
    } catch (error) {
      console.error('Error loading gym rooms:', error);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/owner/courses');
    }
  };

  const handleCourseCreated = (newCourseData: CourseBasicData) => {
    setCourseData(newCourseData);
    setActiveTab('schedules');
    toast({
      title: 'Corso creato',
      description: 'Ora configura gli orari settimanali del corso',
    });
  };

  const handleSchedulesChange = (newSchedules: ScheduleItem[]) => {
    setSchedules(newSchedules);
  };

  const handleSessionsChange = (newSessions: CourseSession[]) => {
    setSessions(newSessions);
  };

  const handleExceptionsChange = (newExceptions: ScheduleException[]) => {
    setExceptions(newExceptions);
  };

  const handleFinalizeCourse = async () => {
    if (!courseData?.id) return;

    setLoading(true);
    try {
      // Save schedules
      if (schedules.length > 0) {
        const scheduleData = schedules.map(schedule => ({
          course_id: courseData.id,
          day_of_week: schedule.dayOfWeek,
          start_time: schedule.time,
          end_time: schedule.end_time,
          room_id: schedule.roomId || null,
          room_name: gymRooms.find(r => r.id === schedule.roomId)?.name || null,
        }));

        const { error: scheduleError } = await supabase
          .from('course_schedules')
          .insert(scheduleData);

        if (scheduleError) throw scheduleError;
      }

      // Save sessions if any
      if (sessions.length > 0) {
        const sessionData = sessions.map(session => ({
          course_id: courseData.id,
          ...session,
        }));

        const { error: sessionError } = await supabase
          .from('course_sessions')
          .insert(sessionData);

        if (sessionError) throw sessionError;
      }

      // Save exceptions if any
      if (exceptions.length > 0) {
        const exceptionData = exceptions.map(exception => ({
          course_id: courseData.id,
          start_date: exception.start_date instanceof Date ? 
            format(exception.start_date, 'yyyy-MM-dd') : exception.start_date,
          end_date: exception.end_date instanceof Date ? 
            format(exception.end_date, 'yyyy-MM-dd') : exception.end_date,
          reason: exception.reason,
        }));

        const { error: exceptionError } = await supabase
          .from('course_schedule_exceptions')
          .insert(exceptionData);

        if (exceptionError) throw exceptionError;
      }

      toast({
        title: 'Successo',
        description: 'Corso configurato completamente',
      });

      navigate('/owner/courses');
    } catch (error) {
      console.error('Error finalizing course:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel completare la configurazione del corso',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTabStatus = (tab: string) => {
    switch (tab) {
      case 'basic':
        return courseData ? 'completed' : 'current';
      case 'schedules':
        return !courseData ? 'disabled' : schedules.length > 0 ? 'completed' : 'current';
      case 'sessions':
        return !courseData || schedules.length === 0 ? 'disabled' : sessions.length > 0 ? 'completed' : 'current';
      case 'exceptions':
        return !courseData ? 'disabled' : 'available';
      default:
        return 'disabled';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Nuovo Corso
          </h1>
          <p className="text-muted-foreground">
            Configura completamente il tuo nuovo corso in pochi passi
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Informazioni Base
            {getTabStatus('basic') === 'completed' && <span className="text-xs">✓</span>}
          </TabsTrigger>
          <TabsTrigger 
            value="schedules" 
            disabled={getTabStatus('schedules') === 'disabled'}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Orari
            {getTabStatus('schedules') === 'completed' && <span className="text-xs">✓</span>}
          </TabsTrigger>
          <TabsTrigger 
            value="sessions" 
            disabled={getTabStatus('sessions') === 'disabled'}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Sessioni
            {getTabStatus('sessions') === 'completed' && <span className="text-xs">✓</span>}
          </TabsTrigger>
          <TabsTrigger 
            value="exceptions" 
            disabled={getTabStatus('exceptions') === 'disabled'}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Eccezioni
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Base del Corso</CardTitle>
              <CardDescription>
                Inserisci tutti i dettagli principali del corso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OwnerCourseForm 
                mode="create" 
                onCourseCreated={handleCourseCreated}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Orari Settimanali</CardTitle>
              <CardDescription>
                Configura quando si svolge il corso durante la settimana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseScheduleManager
                schedule={schedules}
                onChange={handleSchedulesChange}
                gymRooms={gymRooms}
              />
              <div className="mt-6 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('basic')}
                >
                  Indietro
                </Button>
                <Button 
                  onClick={() => setActiveTab('sessions')}
                  disabled={schedules.length === 0}
                >
                  Avanti: Genera Sessioni
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Sessioni</CardTitle>
              <CardDescription>
                Genera automaticamente le sessioni o aggiungile manualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseSessionManager
                courseId={courseData?.id}
                startDate={courseData?.start_date}
                endDate={courseData?.end_date}
                schedules={schedules.map(s => ({
                  day_of_week: s.dayOfWeek,
                  start_time: s.time,
                  end_time: s.end_time,
                  room_id: s.roomId,
                  room_name: gymRooms.find(r => r.id === s.roomId)?.name
                }))}
                maxParticipants={courseData?.max_participants || 10}
                onSessionsChange={handleSessionsChange}
              />
              <div className="mt-6 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('schedules')}
                >
                  Indietro
                </Button>
                <Button 
                  onClick={() => setActiveTab('exceptions')}
                >
                  Avanti: Eccezioni (Opzionale)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Eccezioni agli Orari</CardTitle>
              <CardDescription>
                Configura giorni di chiusura o modifiche agli orari (opzionale)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CourseScheduleExceptions
                exceptions={exceptions}
                onChange={handleExceptionsChange}
              />
              <div className="mt-6 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('sessions')}
                >
                  Indietro
                </Button>
                <Button 
                  onClick={handleFinalizeCourse}
                  disabled={loading}
                  className="bg-gradient-primary text-white"
                >
                  {loading ? 'Salvando...' : 'Completa Corso'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OwnerCourseNew;
