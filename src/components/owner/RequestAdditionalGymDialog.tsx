import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Gym {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface RequestAdditionalGymDialogProps {
  onSuccess?: () => void;
}

export const RequestAdditionalGymDialog: React.FC<RequestAdditionalGymDialogProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState('');
  const [message, setMessage] = useState('');
  const [availableGyms, setAvailableGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGyms, setLoadingGyms] = useState(false);
  const { user } = useAuth();

  const fetchAvailableGyms = async () => {
    if (!user) return;

    try {
      setLoadingGyms(true);

      // Get currently owned gyms
      const { data: ownedGymIds } = await supabase.rpc('get_user_owned_gyms', {
        _user_id: user.id
      });

      // Get all active gyms excluding owned ones
      const { data: gyms, error } = await supabase
        .from('gyms')
        .select('id, name, address, city')
        .eq('is_active', true)
        .not('id', 'in', `(${(ownedGymIds || []).join(',')})`)
        .order('name');

      if (error) {
        console.error('Error fetching available gyms:', error);
        toast.error('Errore nel caricamento delle palestre disponibili');
        return;
      }

      setAvailableGyms(gyms || []);
    } catch (error) {
      console.error('Error in fetchAvailableGyms:', error);
      toast.error('Errore nel caricamento delle palestre');
    } finally {
      setLoadingGyms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGymId) return;

    try {
      setLoading(true);

      const { error } = await supabase.functions.invoke('request-additional-gym', {
        body: {
          gym_id: selectedGymId,
          message: message.trim() || null
        }
      });

      if (error) {
        console.error('Error submitting gym request:', error);
        toast.error('Errore nell\'invio della richiesta');
        return;
      }

      toast.success('Richiesta inviata con successo! Un admin la esaminerà presto.');
      setOpen(false);
      setSelectedGymId('');
      setMessage('');
      onSuccess?.();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Errore nell\'invio della richiesta');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchAvailableGyms();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Collega Palestra
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Richiedi Collegamento Palestra</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gym-select">Seleziona Palestra</Label>
            <Select
              value={selectedGymId}
              onValueChange={setSelectedGymId}
              disabled={loadingGyms}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingGyms ? "Caricamento..." : "Seleziona una palestra"} />
              </SelectTrigger>
              <SelectContent>
                {availableGyms.map((gym) => (
                  <SelectItem key={gym.id} value={gym.id}>
                    <div>
                      <div className="font-medium">{gym.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {gym.address}, {gym.city}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Messaggio (opzionale)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Scrivi un messaggio per spiegare perché vuoi collegare questa palestra..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedGymId}
            >
              {loading ? 'Invio...' : 'Invia Richiesta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};