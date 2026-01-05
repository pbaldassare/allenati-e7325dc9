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
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface WaitlistConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  scheduledDate: string;
  scheduledTime: string;
  creditsRequired: number;
  estimatedPosition: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const WaitlistConfirmDialog: React.FC<WaitlistConfirmDialogProps> = ({
  open,
  onOpenChange,
  courseName,
  scheduledDate,
  scheduledTime,
  creditsRequired,
  estimatedPosition,
  onConfirm,
  isLoading = false
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Iscriviti alla Lista d'Attesa
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <p className="font-medium text-foreground">{courseName}</p>
                <p className="text-sm">
                  📅 {formatDate(scheduledDate)} alle {scheduledTime?.slice(0, 5)}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="text-sm">Posizione stimata in lista:</span>
                <Badge variant="secondary" className="font-bold">
                  #{estimatedPosition}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  <p>
                    Verrà scalato <strong>{creditsRequired} {creditsRequired === 1 ? 'credito' : 'crediti'}</strong> che ti sarà rimborsato automaticamente se:
                  </p>
                </div>
                <ul className="ml-6 space-y-1 text-muted-foreground">
                  <li>• Non riesci ad entrare entro l'inizio del corso</li>
                  <li>• Ti cancelli dalla lista d'attesa</li>
                </ul>
              </div>

              <div className="flex items-start gap-2 text-sm bg-success/10 p-3 rounded-lg">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <p>
                  Se si libera un posto, verrai promosso automaticamente e la tua prenotazione sarà confermata!
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={isLoading}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            Iscriviti alla Lista
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
