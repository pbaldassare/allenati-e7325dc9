import React, { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DateRangeSelector } from '@/components/ui/date-range-selector';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Calendar, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CourseSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id?: string;
  room_name?: string;
}

interface AddPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  schedules: CourseSchedule[];
  maxParticipants: number;
  currentEndDate?: Date;
  onSuccess: () => void;
}

export const AddPeriodDialog: React.FC<AddPeriodDialogProps> = ({
  open,
  onOpenChange,
  courseId,
  schedules,
  maxParticipants,
  currentEndDate,
  onSuccess
}) => {
  const [newStartDate, setNewStartDate] = useState<Date | undefined>(undefined);
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(undefined);
  const [previewSessions, setPreviewSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generatePreviewSessions = () => {
    if (!newStartDate || !newEndDate || schedules.length === 0) return [];
    
    const sessions: any[] = [];
    
    schedules.forEach(schedule => {
      let currentDate = new Date(newStartDate);
      
      // Find the first occurrence of the target day of week
      while (currentDate.getDay() !== schedule.day_of_week) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Generate sessions weekly until end date
      while (currentDate <= newEndDate) {
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

  const handleGeneratePreview = () => {
    const sessions = generatePreviewSessions();
    setPreviewSessions(sessions);
  };

  const handleConfirm = async () => {
    if (!newStartDate || !newEndDate || previewSessions.length === 0) {
      toast({
        title: "Errore",
        description: "Seleziona le date e genera l'anteprima prima di confermare",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch existing sessions to avoid duplicates
      const { data: existingSessions, error: fetchError } = await supabase
        .from('course_sessions')
        .select('session_date, start_time, end_time')
        .eq('course_id', courseId);

      if (fetchError) throw fetchError;

      // Filter out sessions that already exist
      const newSessions = previewSessions.filter(session => {
        return !existingSessions?.some(existing => 
          existing.session_date === session.session_date &&
          existing.start_time === session.start_time &&
          existing.end_time === session.end_time
        );
      });

      if (newSessions.length === 0) {
        toast({
          title: "Nessuna sessione da creare",
          description: "Tutte le sessioni nel periodo selezionato esistono già",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Insert only new sessions
      const { error: insertError } = await supabase
        .from('course_sessions')
        .insert(newSessions.map(session => ({
          course_id: courseId,
          session_date: session.session_date,
          start_time: session.start_time,
          end_time: session.end_time,
          room_id: session.room_id,
          room_name: session.room_name,
          max_participants: session.max_participants,
          available_spots: session.available_spots,
          status: session.status
        })));

      if (insertError) throw insertError;

      const skippedCount = previewSessions.length - newSessions.length;

      // Update course end_date if new period extends beyond current end
      if (!currentEndDate || newEndDate > currentEndDate) {
        const { error: updateError } = await supabase
          .from('courses')
          .update({ end_date: newEndDate.toISOString().split('T')[0] })
          .eq('id', courseId);

        if (updateError) throw updateError;
      }

      toast({
        title: "Periodo aggiunto con successo",
        description: `${newSessions.length} nuove sessioni create${skippedCount > 0 ? ` (${skippedCount} già esistenti saltate)` : ''} dal ${format(newStartDate, 'dd/MM/yyyy')} al ${format(newEndDate, 'dd/MM/yyyy')}`
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset state
      setNewStartDate(undefined);
      setNewEndDate(undefined);
      setPreviewSessions([]);

    } catch (error) {
      console.error('Error adding period:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile aggiungere il periodo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Aggiungi Periodo al Corso
          </DialogTitle>
          <DialogDescription>
            Estendi il corso aggiungendo nuove date. Le sessioni verranno generate secondo gli orari settimanali esistenti.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {schedules.length === 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Nessun orario configurato</AlertTitle>
              <AlertDescription>
                Prima di aggiungere un periodo, configura gli orari settimanali nella tab "Orari"
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <DateRangeSelector
                startDate={newStartDate}
                endDate={newEndDate}
                onStartDateChange={setNewStartDate}
                onEndDateChange={setNewEndDate}
              />

              <Button
                onClick={handleGeneratePreview}
                disabled={!newStartDate || !newEndDate}
                variant="outline"
                className="w-full"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Genera Anteprima Sessioni
              </Button>

              {previewSessions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Anteprima Sessioni</h4>
                    <Badge>{previewSessions.length} sessioni</Badge>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 p-3 border rounded-lg bg-muted/30">
                    {previewSessions.slice(0, 10).map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background border rounded">
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
                    {previewSessions.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center pt-2">
                        ... e altre {previewSessions.length - 10} sessioni
                      </p>
                    )}
                  </div>

                  {currentEndDate && newEndDate > currentEndDate && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Data di fine corso verrà aggiornata</AlertTitle>
                      <AlertDescription>
                        La data di fine del corso verrà estesa da <strong>{format(currentEndDate, 'dd/MM/yyyy')}</strong> a <strong>{format(newEndDate, 'dd/MM/yyyy')}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || previewSessions.length === 0 || schedules.length === 0}
          >
            {loading ? 'Creazione...' : `Conferma e Crea ${previewSessions.length} Sessioni`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
