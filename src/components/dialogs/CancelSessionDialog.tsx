import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Calendar, Clock, Users, MapPin } from 'lucide-react';

interface SessionData {
  id: string;
  course_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_name?: string;
  participant_count: number;
}

interface CancelSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionData;
  onConfirm: (reason?: string) => Promise<void>;
  isLoading: boolean;
}

export const CancelSessionDialog: React.FC<CancelSessionDialogProps> = ({
  open,
  onOpenChange,
  session,
  onConfirm,
  isLoading
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    await onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const formatSessionDate = (date: string) => {
    const sessionDate = new Date(date);
    return sessionDate.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancella Sessione
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Sei sicuro di voler cancellare questa sessione? Questa azione non può essere annullata.
              </p>
              
              {/* Session Details */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-foreground">{session.course_name}</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatSessionDate(session.session_date)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                  </div>
                  
                  {session.room_name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{session.room_name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="secondary">
                      {session.participant_count} partecipanti iscritti
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Warning about refunds */}
              {session.participant_count > 0 && (
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    <strong>Attenzione:</strong> Tutti i {session.participant_count} partecipanti iscritti riceveranno automaticamente il rimborso dei crediti utilizzati.
                  </p>
                </div>
              )}

              {/* Optional reason */}
              <div className="space-y-2">
                <Label htmlFor="cancellation-reason">Motivo cancellazione (opzionale)</Label>
                <Textarea
                  id="cancellation-reason"
                  placeholder="Es: Istruttore malato, problemi strutturali..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Cancellando...
              </div>
            ) : (
              'Cancella Sessione'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};