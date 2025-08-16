import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Users, CreditCard } from 'lucide-react';
import { CreditPurchaseDialog } from './CreditPurchaseDialog';

interface ReservedSpotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  coursePrice?: number;
  creditsRequired: number;
  availableSpots: number;
  reservedSpots: number;
  publicSpots: number;
}

export const ReservedSpotsDialog: React.FC<ReservedSpotsDialogProps> = ({
  open,
  onOpenChange,
  courseName,
  coursePrice,
  creditsRequired,
  availableSpots,
  reservedSpots,
  publicSpots
}) => {
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);

  const handlePurchaseCredits = () => {
    setShowCreditPurchase(true);
  };

  const handleCreditPurchaseComplete = () => {
    setShowCreditPurchase(false);
    onOpenChange(false);
    // Refresh the page or trigger a refetch of user credits
    window.location.reload();
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <Lock className="h-6 w-6 text-warning" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">
              Posti Riservati agli Abbonati
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold text-foreground">{courseName}</h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Posti totali:</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {publicSpots + reservedSpots}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Posti pubblici occupati:</span>
                    <Badge variant="secondary">
                      {publicSpots - availableSpots}/{publicSpots}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Posti riservati:</span>
                    <Badge variant="default" className="bg-primary">
                      <Lock className="h-3 w-3 mr-1" />
                      {reservedSpots}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">
                  <strong>I posti rimanenti sono riservati esclusivamente agli abbonati o a chi possiede crediti.</strong>
                </p>
                <p className="text-sm mt-2 text-muted-foreground">
                  Per accedere a questi posti, acquista un pacchetto crediti o sottoscrivi un abbonamento.
                </p>
              </div>

              {coursePrice && (
                <div className="text-center p-3 bg-accent/10 rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Prezzo singola lezione:</span>
                    <span className="font-semibold ml-1">€{coursePrice}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valido solo per i posti pubblici disponibili
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              onClick={handlePurchaseCredits}
              className="w-full"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Acquista Pacchetto Crediti
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Chiudi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreditPurchaseDialog
        open={showCreditPurchase}
        onOpenChange={setShowCreditPurchase}
        courseName={courseName}
        coursePrice={coursePrice}
        creditsNeeded={creditsRequired}
        onPurchaseComplete={handleCreditPurchaseComplete}
      />
    </>
  );
};