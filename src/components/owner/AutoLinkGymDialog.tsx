import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerGym } from '@/contexts/OwnerGymContext';

interface Gym {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface AutoLinkGymDialogProps {
  onSuccess?: () => void;
}

export const AutoLinkGymDialog: React.FC<AutoLinkGymDialogProps> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState('');
  const [availableGyms, setAvailableGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGyms, setLoadingGyms] = useState(false);
  const { user } = useAuth();
  const { refreshOwnerGyms } = useOwnerGym();

  const fetchAvailableGyms = async () => {
    if (!user) return;

    try {
      setLoadingGyms(true);

      // Get currently owned gyms
      const { data: ownedGymIds } = await supabase.rpc('get_user_owned_gyms', {
        _user_id: user.id
      });

      // Get all active gyms excluding owned ones
      let query = supabase
        .from('gyms')
        .select('id, name, address, city')
        .eq('is_active', true)
        .order('name');

      // Exclude already owned gyms if any exist
      if (ownedGymIds && ownedGymIds.length > 0) {
        query = query.not('id', 'in', `(${ownedGymIds.join(',')})`);
      }

      const { data: gyms, error } = await query;

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

  const handleLinkGym = async () => {
    if (!user || !selectedGymId) return;

    try {
      setLoading(true);
      console.log('🔗 Attempting to link gym:', selectedGymId);

      const { data, error } = await supabase.functions.invoke('owner-link-gym', {
        body: {
          gym_id: selectedGymId
        }
      });

      console.log('🔗 Link gym response:', { data, error });

      if (error) {
        console.error('❌ Error linking gym:', error);
        toast.error(`Errore nel collegamento alla palestra: ${error.message}`);
        return;
      }

      console.log('✅ Successfully linked to gym:', data.gym.name);
      toast.success(`Collegato con successo alla palestra ${data.gym.name}!`);
      
      // Refresh the owner gyms context to show the new gym immediately
      await refreshOwnerGyms();
      
      setOpen(false);
      setSelectedGymId('');
      onSuccess?.();
    } catch (error) {
      console.error('❌ Error in handleLinkGym:', error);
      toast.error('Errore imprevisto nel collegamento alla palestra');
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
          <DialogTitle>Collega Nuova Palestra</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Seleziona Palestra</label>
            <Select
              value={selectedGymId}
              onValueChange={setSelectedGymId}
              disabled={loadingGyms}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingGyms ? "Caricamento..." : "Seleziona una palestra"} />
              </SelectTrigger>
              <SelectContent>
                {availableGyms.length === 0 && !loadingGyms ? (
                  <div className="flex items-center gap-2 p-2 text-muted-foreground">
                    <Building className="w-4 h-4" />
                    Nessuna palestra disponibile
                  </div>
                ) : (
                  availableGyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>
                      <div>
                        <div className="font-medium">{gym.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {gym.address}, {gym.city}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
              onClick={handleLinkGym}
              disabled={loading || !selectedGymId}
            >
              {loading ? 'Collegamento...' : 'Collega Subito'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};