import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, ArrowRight, Loader2, Plus, Sparkles, Zap } from 'lucide-react';
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

  const joinGym = async () => {
    if (!user || !selectedGymId) return;

    const selectedGym = availableGyms.find(g => g.id === selectedGymId);
    if (!selectedGym) return;

    setRequesting(true);
    try {
      console.log('🏃‍♂️ Tentativo di entrare nella palestra:', selectedGymId);

      // Verifica se l'utente è già membro
      const { data: existingMembership } = await supabase
        .from('user_gym_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('gym_id', selectedGymId)
        .eq('status', 'active')
        .single();

      if (existingMembership) {
        toast({
          title: 'Già iscritto',
          description: 'Sei già membro di questa palestra',
          variant: 'destructive',
        });
        return;
      }

      // Crea membership diretta come member
      const { error } = await supabase
        .from('user_gym_memberships')
        .insert({
          user_id: user.id,
          gym_id: selectedGymId,
          membership_type: 'member',
          status: 'active',
        });

      if (error) throw error;

      console.log('✅ Collegamento riuscito alla palestra:', selectedGym.name);
      toast({
        title: 'Benvenuto!',
        description: `Sei ora membro di ${selectedGym.name}!`,
      });

      // Reset form e aggiorna contesti
      setSelectedGymId('');
      setSearchTerm('');
      setIsOpen(false);
      await loadAvailableGyms();
      await refreshGyms();
      onRequestSent?.();
    } catch (error) {
      console.error('❌ Errore nel collegamento alla palestra:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile collegarsi alla palestra',
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
      <div className="text-center py-6 px-4 bg-gradient-subtle rounded-lg border border-primary/20">
        <Sparkles className="w-8 h-8 mx-auto text-primary mb-2 animate-pulse" />
        <p className="text-sm font-medium bg-gradient-text bg-clip-text text-transparent">
          Tutte le palestre disponibili sono già nel tuo account
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${isMobile ? 'p-4' : ''}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <Input
          placeholder="Cerca palestra per nome o città..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-10 border-primary/20 focus:border-primary focus:ring-primary/20 bg-gradient-subtle"
        />
      </div>

      {/* Gym Selector */}
      <Select 
        value={selectedGymId} 
        onValueChange={setSelectedGymId}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="h-10 border-primary/20 focus:border-primary bg-gradient-subtle">
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

      {/* Join Button */}
      <Button
        onClick={joinGym}
        disabled={!selectedGymId || requesting}
        className="w-full h-10 bg-gradient-accent hover:bg-gradient-accent/90 text-white shadow-glow transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:scale-100"
        size="sm"
      >
        {requesting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Collegamento...
          </>
        ) : (
          <>
            <ArrowRight className="w-4 h-4 mr-2" />
            Entra nella Palestra
            <Zap className="w-3 h-3 ml-1 animate-pulse" />
          </>
        )}
      </Button>
    </div>
  );
}