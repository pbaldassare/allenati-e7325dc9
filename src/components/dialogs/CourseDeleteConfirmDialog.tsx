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
import { Trash2 } from 'lucide-react';

interface CourseDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  courseNames: string[];
  isLoading?: boolean;
}

export const CourseDeleteConfirmDialog: React.FC<CourseDeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  courseNames,
  isLoading = false
}) => {
  const isMultiple = courseNames.length > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            <AlertDialogTitle>
              {isMultiple ? 'Elimina Corsi' : 'Elimina Corso'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              {isMultiple
                ? `Sei sicuro di voler eliminare questi ${courseNames.length} corsi?`
                : `Sei sicuro di voler eliminare il corso "${courseNames[0]}"?`}
            </p>
            {courseNames.length <= 5 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">
                  {isMultiple ? 'Corsi da eliminare:' : 'Corso da eliminare:'}
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {courseNames.map((name, index) => (
                    <li key={index} className="pl-2 border-l-2 border-destructive/20">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium">⚠️ Attenzione:</p>
              <p className="text-sm text-muted-foreground mt-1">
                Questa azione eliminerà anche:
              </p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Tutti gli orari programmati</li>
                <li>• Tutte le prenotazioni attive</li>
                <li>• Tutti i dati associati al corso</li>
              </ul>
              <p className="text-sm text-destructive mt-2 font-medium">
                Questa operazione non può essere annullata.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Eliminando...' : 'Elimina'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};