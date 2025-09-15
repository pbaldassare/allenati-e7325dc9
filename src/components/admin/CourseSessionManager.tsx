import React, { useState, useEffect } from 'react';
import { format, addWeeks, startOfISOWeek as startOfWeek, endOfISOWeek as endOfWeek } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WeeksSelector } from '@/components/ui/weeks-selector';

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
  onSessionsChange: (sessions: CourseSession[]) => void;
  autoGenerate?: boolean;
  initialSessions?: CourseSession[];
  durationWeeks?: number;
  onDurationWeeksChange?: (weeks: number) => void;
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
  autoGenerate = true,
  initialSessions = [],
  durationWeeks = 12,
  onDurationWeeksChange
}) => {
  const [sessions, setSessions] = useState<CourseSession[]>(initialSessions);
  const [generatedSessions, setGeneratedSessions] = useState<CourseSession[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentDurationWeeks, setCurrentDurationWeeks] = useState(durationWeeks);

  // Generate sessions automatically based on schedules and duration weeks
  const generateSessions = () => {
    if (!startDate || !schedules.length) {
      setGeneratedSessions([]);
      return;
    }

    // Calculate end date based on duration weeks
    const calculatedEndDate = addWeeks(startDate, currentDurationWeeks);

    console.log('🔄 Generating sessions from', format(startDate, 'yyyy-MM-dd'), 'to', format(calculatedEndDate, 'yyyy-MM-dd'));
    console.log('📋 Schedules:', schedules.length);
    console.log('⏱️ Duration:', currentDurationWeeks, 'weeks');

    // Use Map to prevent duplicates more efficiently
    const sessionMap = new Map<string, CourseSession>();
    let currentDate = new Date(startDate);

    while (currentDate <= calculatedEndDate) {
      schedules.forEach(schedule => {
        if (currentDate.getDay() === schedule.day_of_week) {
          const sessionDate = format(currentDate, 'yyyy-MM-dd');
          const sessionKey = `${sessionDate}-${schedule.start_time}`;
          
          // Only create if not already exists
          if (!sessionMap.has(sessionKey)) {
            sessionMap.set(sessionKey, {
              session_date: sessionDate,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              room_id: schedule.room_id,
              room_name: schedule.room_name,
              max_participants: maxParticipants,
              available_spots: maxParticipants,
              status: 'scheduled'
            });
          }
        }
      });
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    const uniqueSessions = Array.from(sessionMap.values());
    console.log('✅ Generated', uniqueSessions.length, 'unique sessions');
    setGeneratedSessions(uniqueSessions);
    setShowPreview(true);
  };

  // Handle duration weeks change
  const handleDurationWeeksChange = (weeks: number) => {
    setCurrentDurationWeeks(weeks);
    onDurationWeeksChange?.(weeks);
  };

  // Apply generated sessions
  const applyGeneratedSessions = async () => {
    setSaving(true);
    try {
      setSessions(generatedSessions);
      await onSessionsChange(generatedSessions);
      setShowPreview(false);
    } finally {
      setSaving(false);
    }
  };

  // Add manual session
  const addManualSession = async () => {
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
    await onSessionsChange(updatedSessions);
  };

  // Remove session
  const removeSession = async (index: number) => {
    const updatedSessions = sessions.filter((_, i) => i !== index);
    setSessions(updatedSessions);
    await onSessionsChange(updatedSessions);
  };

  // Update session
  const updateSession = async (index: number, updates: Partial<CourseSession>) => {
    const updatedSessions = sessions.map((session, i) => 
      i === index ? { ...session, ...updates } : session
    );
    setSessions(updatedSessions);
    await onSessionsChange(updatedSessions);
  };

  // Auto generate when dependencies change
  useEffect(() => {
    if (autoGenerate && startDate && schedules.length > 0) {
      generateSessions();
    }
  }, [startDate, schedules, maxParticipants, autoGenerate, currentDurationWeeks]);

  // Sync duration weeks with prop
  useEffect(() => {
    setCurrentDurationWeeks(durationWeeks);
  }, [durationWeeks]);

  const sessionCount = sessions.length;
  const weeklySessionCount = schedules.length;
  const calculatedEndDate = startDate ? addWeeks(startDate, currentDurationWeeks) : undefined;

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Gestione Sessioni Corso
          </CardTitle>
          <CardDescription>
            Genera automaticamente le sessioni basate sui pattern ricorrenti o aggiungi manualmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Duration Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WeeksSelector
              value={currentDurationWeeks}
              onChange={handleDurationWeeksChange}
              startDate={startDate}
              disabled={saving}
            />
            {startDate && calculatedEndDate && schedules.length > 0 && (
              <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium">
                    {weeklySessionCount} sessioni/settimana × {currentDurationWeeks} settimane
                  </p>
                  <p className="text-lg font-bold text-primary">
                    = {weeklySessionCount * currentDurationWeeks} sessioni totali
                  </p>
                  <Button onClick={generateSessions} variant="outline" size="sm" className="mt-2">
                    Genera Sessioni
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!startDate ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Imposta la data di inizio del corso per generare le sessioni automaticamente.
              </AlertDescription>
            </Alert>
          ) : !schedules.length ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Configura almeno un pattern di orario ricorrente per generare le sessioni.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
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
                {sessionCount} sessioni totali configurate
              </CardDescription>
            </div>
            <Button onClick={addManualSession} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Manuale
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuna sessione programmata</p>
              <p className="text-sm">Genera automaticamente o aggiungi manualmente le sessioni</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {sessions.map((session, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {format(new Date(session.session_date), 'dd/MM/yyyy')}
                    </Badge>
                    <span className="text-sm font-medium">
                      {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                    </span>
                    {session.room_name && (
                      <Badge variant="secondary">{session.room_name}</Badge>
                    )}
                    <Badge variant={session.status === 'scheduled' ? 'default' : 'secondary'}>
                      {session.status === 'scheduled' ? 'Programmata' : 
                       session.status === 'cancelled' ? 'Cancellata' : 'Completata'}
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