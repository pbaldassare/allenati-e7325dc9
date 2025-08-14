import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, Infinity } from 'lucide-react';

interface CreditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  coursePrice?: number;
  creditsNeeded: number;
  onPurchaseComplete?: () => void;
}

export function CreditPurchaseDialog({
  open,
  onOpenChange,
  courseName,
  coursePrice,
  creditsNeeded,
  onPurchaseComplete,
}: CreditPurchaseDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePurchaseCredits = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Recupera crediti attuali
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_credits')
        .eq('user_id', user.id)
        .single();

      const currentCredits = profileData?.current_credits || 0;
      const newBalance = currentCredits + creditsNeeded;

      // Aggiorna crediti nel profilo
      await supabase
        .from('profiles')
        .update({ current_credits: newBalance })
        .eq('user_id', user.id);

      // Registra transazione
      await supabase
        .from('credits_transactions')
        .insert({
          user_id: user.id,
          amount: creditsNeeded,
          balance_after: newBalance,
          transaction_type: 'one_time_purchase',
          description: `Acquisto ${creditsNeeded} credito/i per ${courseName}`,
        });

      toast({
        title: 'Crediti acquistati!',
        description: `Hai acquistato ${creditsNeeded} credito/i. Ora puoi prenotare il corso.`,
      });

      onPurchaseComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Errore nell\'acquisto crediti:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile completare l\'acquisto dei crediti',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSubscriptions = () => {
    onOpenChange(false);
    window.location.href = '/abbonamenti';
  };

  const formatPrice = (price?: number) => {
    return price && price > 0 ? `€${price.toFixed(2)}` : 'Gratuito';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span>Crediti insufficienti</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Non hai abbastanza crediti per prenotare <strong>{courseName}</strong>.
            </p>
            
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Crediti richiesti:</span>
                <span className="font-medium">{creditsNeeded}</span>
              </div>
              {coursePrice && coursePrice > 0 ? (
                <div className="flex justify-between text-sm">
                  <span>Prezzo singolo credito:</span>
                  <span className="font-medium">{formatPrice(coursePrice)}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Corso gratuito - acquisto solo crediti
                </div>
              )}
            </div>
            
            <p className="text-sm">
              Vuoi acquistare {creditsNeeded} credito/i ora o preferisci gestire i tuoi abbonamenti?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col space-y-2">
          <div className="flex space-x-2 w-full">
            <AlertDialogCancel className="flex-1">
              Annulla
            </AlertDialogCancel>
            
            <Button
              onClick={handlePurchaseCredits}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Acquisto...
                </>
              ) : (
                <>
                  Acquista {creditsNeeded} Credito/i
                </>
              )}
            </Button>
          </div>
          
          <Button
            onClick={handleGoToSubscriptions}
            variant="outline"
            className="w-full"
          >
            <Infinity className="w-4 h-4 mr-2" />
            Vai agli Abbonamenti
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}