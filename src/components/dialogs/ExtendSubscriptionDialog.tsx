import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtendSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: {
    id: string;
    user_id: string;
    expires_at: string;
    user: {
      first_name: string;
      last_name: string;
      email: string;
    };
    plan: {
      name: string;
    };
  };
  onExtended: () => void;
}

export default function ExtendSubscriptionDialog({
  isOpen,
  onClose,
  subscription,
  onExtended
}: ExtendSubscriptionDialogProps) {
  const [selectedMonths, setSelectedMonths] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleExtend = async () => {
    if (!selectedMonths) {
      toast.error('Seleziona il periodo di estensione');
      return;
    }

    setLoading(true);
    try {
      const months = parseInt(selectedMonths);
      const currentExpiry = new Date(subscription.expires_at);
      const newExpiry = new Date(currentExpiry);
      newExpiry.setMonth(newExpiry.getMonth() + months);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success(`Abbonamento esteso di ${months} ${months === 1 ? 'mese' : 'mesi'}`);
      onExtended();
      onClose();
      setSelectedMonths('');
    } catch (error) {
      console.error('Errore nell\'estensione:', error);
      toast.error('Errore nell\'estensione dell\'abbonamento');
    } finally {
      setLoading(false);
    }
  };

  const getNewExpiryDate = () => {
    if (!selectedMonths) return null;
    const months = parseInt(selectedMonths);
    const currentExpiry = new Date(subscription.expires_at);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + months);
    return newExpiry;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Estendi Abbonamento Unlimited Annuale</DialogTitle>
          <DialogDescription>
            Estendi l'abbonamento per {subscription.user.first_name} {subscription.user.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm">
              <div className="font-medium">{subscription.plan.name}</div>
              <div className="text-muted-foreground">{subscription.user.email}</div>
              <div className="text-muted-foreground">
                Scadenza attuale: {new Date(subscription.expires_at).toLocaleDateString('it-IT')}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="months">Periodo di estensione</Label>
            <Select value={selectedMonths} onValueChange={setSelectedMonths}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 mese</SelectItem>
                <SelectItem value="3">3 mesi</SelectItem>
                <SelectItem value="6">6 mesi</SelectItem>
                <SelectItem value="12">12 mesi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {getNewExpiryDate() && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm">
                <div className="font-medium text-primary">Nuova data di scadenza:</div>
                <div className="text-primary">
                  {getNewExpiryDate()!.toLocaleDateString('it-IT')}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleExtend} disabled={loading || !selectedMonths}>
            {loading ? 'Estensione...' : 'Estendi Abbonamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}