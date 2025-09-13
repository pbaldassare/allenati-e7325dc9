import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, ShoppingCart } from 'lucide-react';

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
}: CreditPurchaseDialogProps) {
  const handleGoToSubscriptions = () => {
    onOpenChange(false);
    window.location.href = '/subscriptions';
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
                  <span>Prezzo corso:</span>
                  <span className="font-medium">{formatPrice(coursePrice)}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Corso gratuito
                </div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              Vai alla pagina abbonamenti per acquistare crediti o attivare un abbonamento.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex space-x-2">
          <AlertDialogCancel>
            Annulla
          </AlertDialogCancel>
          
          <Button
            onClick={handleGoToSubscriptions}
            className="flex-1"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Vai agli Abbonamenti
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}