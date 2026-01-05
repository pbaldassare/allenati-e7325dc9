import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Trash2, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DateRangeSelector } from '@/components/ui/date-range-selector';
import { supabase } from '@/integrations/supabase/client';

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

interface CourseSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id?: string;
  room_name?: string;
}

interface CourseSessionManagerProps {
  courseId?: string;
  startDate?: Date;
  endDate?: Date;
  schedules: CourseSchedule[];
  maxParticipants: number;
  onSessionsChange?: (sessions: CourseSession[]) => void;
  onDateRangeChange?: (startDate: Date, endDate: Date) => void;
}

const getDayName = (dayOfWeek: number): string => {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return days[dayOfWeek] || '';
};

export const CourseSessionManager: React.FC<CourseSessionManagerProps> = ({
  courseId,
  startDate,
  endDate,
  schedules,
  maxParticipants,
  onSessionsChange,
  onDateRangeChange
}) => {
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [generatedSessions, setGeneratedSessions] = useState<CourseSession[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingFromDb, setLoadingFromDb] = useState(false);
  const [currentStartDate, setCurrentStartDate] = useState(startDate);
  const [currentEndDate, setCurrentEndDate] = useState(endDate);

  // Fetch existing sessions from DB when courseId is provided
  useEffect(() => {
    if (courseId) {
      fetchSessionsFromDb();
    }
  }, [courseId]);

  const fetchSessionsFromDb = async () => {
    if (!courseId) return;
    
    setLoadingFromDb(true);
    try {
      const { data, error } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseId)
        .order('session_date')
        .order('start_time');

      if (error) {
        console.error('Error fetching sessions:', error);
        return;
      }

      const transformedSessions: CourseSession[] = (data || []).map(s => ({
        id: s.id,
        session_date: s.session_date,
        start_time: s.start_time,
        end_time: s.end_time,
        room_id: s.room_id || undefined,
        room_name: s.room_name || undefined,
        max_participants: s.max_participants,
        available_spots: s.available_spots,
        status: s.status as 'scheduled' | 'cancelled' | 'completed'
      }));

      setSessions(transformedSessions);
      console.log(`📊 Loaded ${transformedSessions.length} sessions from DB for course ${courseId}`);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingFromDb(false);
    }
  };

  const generateSessions = () => {
    if (!currentStartDate || !currentEndDate || schedules.length === 0) return [];
    
    const sessions: CourseSession[] = [];
    
    schedules.forEach(schedule => {
      let currentDate = new Date(currentStartDate);
      
      // Find the first occurrence of the target day of week
      while (currentDate.getDay() !== schedule.day_of_week) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Generate sessions weekly until end date
      while (currentDate <= currentEndDate) {
        sessions.push({
          session_date: currentDate.toISOString().split('T')[0],
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          room_id: schedule.room_id,
          room_name: schedule.room_name,
          max_participants: maxParticipants,
          available_spots: maxParticipants,
          status: 'scheduled'
        });
        
        // Move to next week
        currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    });
    
    return sessions.sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  };

  const handleDateRangeChange = (newStartDate: Date, newEndDate: Date) => {
    setCurrentStartDate(newStartDate);
    setCurrentEndDate(newEndDate);
    if (onDateRangeChange) {
      onDateRangeChange(newStartDate, newEndDate);
    }
  };

  const applyGeneratedSessions = () => {
    setSessions(generatedSessions);
    setShowPreview(false);
    if (onSessionsChange) {
      onSessionsChange(generatedSessions);
    }
  };

  const addManualSession = () => {
    const newSession: CourseSession = {
      session_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '10:00',
      end_time: '11:00',
      max_participants: maxParticipants,
      available_spots: maxParticipants,
      status: 'scheduled'
    };
    
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    if (onSessionsChange) {
      onSessionsChange(updatedSessions);
    }
  };

  const removeSession = (index: number) => {
    const updatedSessions = sessions.filter((_, i) => i !== index);
    setSessions(updatedSessions);
    if (onSessionsChange) {
      onSessionsChange(updatedSessions);
    }
  };

  const updateSession = (index: number, updates: Partial<CourseSession>) => {
    const updatedSessions = sessions.map((session, i) => 
      i === index ? { ...session, ...updates } : session
    );
    setSessions(updatedSessions);
    if (onSessionsChange) {
      onSessionsChange(updatedSessions);
    }
  };

  // Auto-generate sessions when dependencies change
  useEffect(() => {
    if (currentStartDate && currentEndDate && schedules.length > 0) {
      const newGeneratedSessions = generateSessions();
      setGeneratedSessions(newGeneratedSessions);
      setShowPreview(true);
    }
  }, [currentStartDate, currentEndDate, schedules, maxParticipants]);

  // Sync dates with props
  useEffect(() => {
    setCurrentStartDate(startDate);
    setCurrentEndDate(endDate);
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Configurazione Date Corso
          </CardTitle>
          <CardDescription>
            Imposta le date di inizio e fine del corso per generare automaticamente le sessioni
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DateRangeSelector
            startDate={currentStartDate}
            endDate={currentEndDate}
            onStartDateChange={(date) => {
              setCurrentStartDate(date || new Date());
              if (date && currentEndDate) {
                handleDateRangeChange(date, currentEndDate);
              }
            }}
            onEndDateChange={(date) => {
              setCurrentEndDate(date || new Date());
              if (currentStartDate && date) {
                handleDateRangeChange(currentStartDate, date);
              }
            }}
          />
          
          <Button 
            onClick={() => {
              const newGeneratedSessions = generateSessions();
              setGeneratedSessions(newGeneratedSessions);
              setShowPreview(true);
            }}
            disabled={!currentStartDate || !currentEndDate || schedules.length === 0}
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Genera Sessioni Automaticamente
          </Button>
        </CardContent>

        {(!currentStartDate || !currentEndDate || schedules.length === 0) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configurazione Incompleta</AlertTitle>
            <AlertDescription>
              {!currentStartDate && "Data di inizio del corso non specificata. "}
              {!currentEndDate && "Data di fine del corso non specificata. "}
              {schedules.length === 0 && "Nessun orario configurato. "}
              Completa la configurazione per generare le sessioni.
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Preview Generated Sessions */}
      {showPreview && generatedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Anteprima Sessioni Generate</CardTitle>
            <CardDescription>
              {generatedSessions.length} sessioni verranno create. Conferma per applicare.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-48 overflow-y-auto space-y-2">
              {generatedSessions.slice(0, 10).map((session, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {format(new Date(session.session_date), 'dd/MM/yyyy')}
                    </Badge>
                    <span className="text-sm">
                      {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                    </span>
                    {session.room_name && (
                      <Badge variant="secondary">{session.room_name}</Badge>
                    )}
                  </div>
                </div>
              ))}
              {generatedSessions.length > 10 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... e altre {generatedSessions.length - 10} sessioni
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={applyGeneratedSessions} className="flex-1" disabled={saving}>
                {saving ? 'Salvataggio...' : `Conferma e Salva (${generatedSessions.length} sessioni)`}
              </Button>
              <Button onClick={() => setShowPreview(false)} variant="outline" disabled={saving}>
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sessioni Programmate</CardTitle>
              <CardDescription>
                {sessions.length} sessioni totali configurate
              </CardDescription>
            </div>
            <Button onClick={addManualSession} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Manuale
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingFromDb ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Caricamento sessioni dal database...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna sessione programmata</p>
              <p className="text-sm">Genera automaticamente o aggiungi manualmente le sessioni</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {sessions.map((session, index) => (
                <div key={session.id || index} className={`flex items-center justify-between p-3 border rounded-lg ${
                  session.status === 'cancelled' ? 'bg-destructive/10 border-destructive/30' : ''
                }`}>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {format(new Date(session.session_date), 'dd/MM/yyyy')}
                    </Badge>
                    <span className={`text-sm font-medium ${session.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}`}>
                      {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                    </span>
                    {session.room_name && (
                      <Badge variant="secondary">{session.room_name}</Badge>
                    )}
                    <Badge variant={
                      session.status === 'scheduled' ? 'default' : 
                      session.status === 'cancelled' ? 'destructive' : 'secondary'
                    }>
                      {session.status === 'scheduled' ? 'Programmata' : 
                       session.status === 'cancelled' ? 'Annullata' : 'Completata'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {session.available_spots}/{session.max_participants} posti
                    </span>
                    <Button
                      onClick={() => removeSession(index)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};