import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2, Edit, AlertTriangle } from 'lucide-react';
import type { ScheduleItem } from '@/types/schedule';

interface ScheduleChange {
  type: 'added' | 'removed' | 'modified';
  schedule: ScheduleItem;
  oldSchedule?: ScheduleItem;
}

interface SaveScheduleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  changes: ScheduleChange[];
  isLoading?: boolean;
}

const daysOfWeek = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export const SaveScheduleConfirmDialog: React.FC<SaveScheduleConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  changes,
  isLoading = false,
}) => {
  const addedSchedules = changes.filter(c => c.type === 'added');
  const removedSchedules = changes.filter(c => c.type === 'removed');
  const modifiedSchedules = changes.filter(c => c.type === 'modified');

  const formatSchedule = (schedule: ScheduleItem) => {
    const day = daysOfWeek[schedule.dayOfWeek] || schedule.day;
    return `${day} ${schedule.time}-${schedule.end_time}`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Conferma Salvataggio Orari</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>Stai per salvare le seguenti modifiche agli orari:</p>
              
              {addedSchedules.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Plus className="h-4 w-4" />
                    Orari aggiunti ({addedSchedules.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {addedSchedules.map((change, idx) => (
                      <Badge key={idx} variant="outline" className="bg-primary/10 border-primary/20">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatSchedule(change.schedule)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {removedSchedules.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Orari rimossi ({removedSchedules.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {removedSchedules.map((change, idx) => (
                      <Badge key={idx} variant="outline" className="bg-destructive/10 border-destructive/20">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatSchedule(change.schedule)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {modifiedSchedules.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Edit className="h-4 w-4" />
                    Orari modificati ({modifiedSchedules.length})
                  </div>
                  <div className="space-y-1">
                    {modifiedSchedules.map((change, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="bg-muted/50 border-muted-foreground/20">
                          {change.oldSchedule && formatSchedule(change.oldSchedule)}
                        </Badge>
                        <span>→</span>
                        <Badge variant="outline" className="bg-muted/50 border-muted-foreground/20">
                          {formatSchedule(change.schedule)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium">Le sessioni future senza prenotazioni verranno aggiornate.</p>
                    <p className="text-muted-foreground mt-1">
                      Le sessioni con utenti già prenotati restano <strong>al vecchio orario/sala</strong> e i partecipanti restano confermati. Per spostarli, cancella manualmente la sessione dal calendario.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Salvataggio...' : 'Conferma Salvataggio'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
