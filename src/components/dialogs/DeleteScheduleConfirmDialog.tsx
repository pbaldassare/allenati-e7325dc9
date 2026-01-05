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
import { Clock, MapPin } from 'lucide-react';

interface DeleteScheduleConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  scheduleToDelete?: {
    day: string;
    time: string;
    end_time: string;
    roomName?: string;
  };
}

export function DeleteScheduleConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  scheduleToDelete,
}: DeleteScheduleConfirmDialogProps) {
  if (!scheduleToDelete) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Elimina Orario</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Sei sicuro di voler eliminare questo orario?</p>
              <div className="text-sm space-y-1">
                <p className="text-destructive font-medium">Cosa verrà eliminato:</p>
                <ul className="list-disc list-inside ml-2 text-muted-foreground">
                  <li>Sessioni future associate a questo orario</li>
                  <li>Prenotazioni future per queste sessioni</li>
                </ul>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-green-600 dark:text-green-500 font-medium">Cosa rimane intatto:</p>
                <ul className="list-disc list-inside ml-2 text-muted-foreground">
                  <li>Tutte le sessioni passate</li>
                  <li>Tutte le prenotazioni storiche</li>
                  <li>I dati per report e statistiche</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4">
          <div className="text-sm font-medium mb-2">Orario da eliminare:</div>
          <Badge variant="destructive" className="flex items-center gap-2 w-fit">
            <Clock className="h-3 w-3" />
            {scheduleToDelete.day} {scheduleToDelete.time}-{scheduleToDelete.end_time}
            {scheduleToDelete.roomName && (
              <>
                <MapPin className="h-3 w-3" />
                {scheduleToDelete.roomName}
              </>
            )}
          </Badge>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Elimina Orario
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}