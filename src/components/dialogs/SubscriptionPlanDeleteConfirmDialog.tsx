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
import { Trash2, Euro, Calendar, Users } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  credits_included: number;
  unlimited_access: boolean;
  is_trial: boolean;
}

interface SubscriptionPlanDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  planToDelete: SubscriptionPlan | null;
  isLoading?: boolean;
}

export const SubscriptionPlanDeleteConfirmDialog: React.FC<SubscriptionPlanDeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  planToDelete,
  isLoading = false
}) => {
  if (!planToDelete) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            <AlertDialogTitle>
              Elimina Piano Abbonamento
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Sei sicuro di voler eliminare definitivamente il piano "{planToDelete.name}"?
            </p>
            
            {/* Piano Details */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{planToDelete.name}</span>
                  <div className="flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    <span className="font-medium">€{planToDelete.price.toFixed(2)}</span>
                  </div>
                </div>
                
                {planToDelete.description && (
                  <p className="text-sm text-muted-foreground">{planToDelete.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{planToDelete.duration_days} giorni</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    {planToDelete.unlimited_access ? (
                      <Badge variant="default" className="text-xs">Accesso Illimitato</Badge>
                    ) : (
                      <span>{planToDelete.credits_included} crediti</span>
                    )}
                  </div>
                  
                  {planToDelete.is_trial && (
                    <Badge variant="outline" className="text-xs">Trial</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Warning Section */}
            <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium">⚠️ Attenzione:</p>
              <p className="text-sm text-muted-foreground mt-1">
                Eliminando questo piano abbonamento:
              </p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Il piano non sarà più disponibile per i nuovi abbonamenti</li>
                <li>• Gli abbonamenti attivi esistenti continueranno fino alla scadenza</li>
                <li>• I dati storici delle transazioni verranno mantenuti</li>
                <li>• Non sarà possibile riattivare questo piano specifico</li>
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
            {isLoading ? 'Eliminando...' : 'Elimina Definitivamente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};