import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, Send, Loader2, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Gym {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  email?: string;
  phone?: string;
}

interface GymJoinDropdownProps {
  onRequestSent?: () => void;
}

export function GymJoinDropdown({ onRequestSent }: GymJoinDropdownProps) {
  const { user } = useAuth();
  const { refreshGyms } = useGym();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [availableGyms, setAvailableGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadAvailableGyms();
  }, [user]);

  const loadAvailableGyms = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Ottieni palestre a cui l'utente NON è già iscritto
      const { data: userGyms } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const userGymIds = userGyms?.map(m => m.gym_id) || [];

      let query = supabase
        .from('gyms')
        .select('id, name, description, address, city, email, phone')
        .eq('is_active', true);

      if (userGymIds.length > 0) {
        query = query.not('id', 'in', `(${userGymIds.join(',')})`);
      }

      const { data: gyms, error } = await query;

      if (error) throw error;
      setAvailableGyms(gyms || []);
    } catch (error) {
      console.error('Error loading gyms:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le palestre disponibili',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestJoinGym = async () => {
    if (!user || !selectedGymId) return;

    const selectedGym = availableGyms.find(g => g.id === selectedGymId);
    if (!selectedGym) return;

    setRequesting(true);
    try {
      // Verifica se c'è già una richiesta pendente
      const { data: existingRequest } = await supabase
        .from('gym_join_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('gym_id', selectedGymId)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
        toast({
          title: 'Richiesta già inviata',
          description: 'Hai già una richiesta pendente per questa palestra',
          variant: 'destructive',
        });
        return;
      }

      // Crea nuova richiesta
      const { error } = await supabase
        .from('gym_join_requests')
        .insert({
          user_id: user.id,
          gym_id: selectedGymId,
          status: 'pending',
          message: `Richiesta di accesso alla palestra ${selectedGym.name}`,
        });

      if (error) throw error;

      toast({
        title: 'Richiesta inviata!',
        description: `La tua richiesta per ${selectedGym.name} è stata inviata.`,
      });

      // Reset form e ricarica
      setSelectedGymId('');
      setSearchTerm('');
      setIsOpen(false);
      await loadAvailableGyms();
      onRequestSent?.();
    } catch (error) {
      console.error('Error requesting gym access:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile inviare la richiesta',
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  const filteredGyms = availableGyms.filter(gym =>
    gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (availableGyms.length === 0 && !loading) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Tutte le palestre disponibili sono già nel tuo account
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${isMobile ? 'p-4' : ''}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca palestra per nome o città..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {/* Gym Selector */}
      <Select 
        value={selectedGymId} 
        onValueChange={setSelectedGymId}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Seleziona una palestra" />
        </SelectTrigger>
        <SelectContent className="max-h-60 z-[150]">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm">Caricamento...</span>
            </div>
          ) : filteredGyms.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchTerm ? 'Nessuna palestra trovata' : 'Nessuna palestra disponibile'}
            </div>
          ) : (
            filteredGyms.map((gym) => (
              <SelectItem key={gym.id} value={gym.id} className="cursor-pointer py-3">
                <div className="flex flex-col items-start space-y-1 w-full">
                  <span className="font-medium text-sm">{gym.name}</span>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{gym.city}</span>
                  </div>
                  {gym.address && (
                    <div className="text-xs text-muted-foreground/70 truncate w-full">
                      {gym.address}
                    </div>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Request Button */}
      <Button
        onClick={requestJoinGym}
        disabled={!selectedGymId || requesting}
        className="w-full h-10"
        size="sm"
      >
        {requesting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Inviando...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Richiedi Accesso
          </>
        )}
      </Button>
    </div>
  );
}