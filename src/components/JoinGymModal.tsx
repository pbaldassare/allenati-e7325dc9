import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, MapPin, Mail, Phone, Send, Loader2 } from 'lucide-react';

interface Gym {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  email?: string;
  phone?: string;
}

interface JoinGymModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinGymModal({ open, onOpenChange }: JoinGymModalProps) {
  const { user } = useAuth();
  const { refreshGyms } = useGym();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [availableGyms, setAvailableGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadAvailableGyms();
    }
  }, [open, user]);

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

  const requestJoinGym = async (gym: Gym) => {
    if (!user) return;

    setRequesting(gym.id);
    try {
      // Verifica se c'è già una richiesta pendente
      const { data: existingRequest } = await supabase
        .from('gym_join_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('gym_id', gym.id)
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
          gym_id: gym.id,
          status: 'pending',
          message: `Richiesta di accesso alla palestra ${gym.name}`,
        });

      if (error) throw error;

      toast({
        title: 'Richiesta inviata!',
        description: `La tua richiesta per ${gym.name} è stata inviata. Riceverai una notifica quando verrà elaborata.`,
      });

      // Ricarica le palestre disponibili
      await loadAvailableGyms();
    } catch (error) {
      console.error('Error requesting gym access:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile inviare la richiesta',
        variant: 'destructive',
      });
    } finally {
      setRequesting(null);
    }
  };

  const filteredGyms = availableGyms.filter(gym =>
    gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Unisciti a una Palestra</DialogTitle>
          <DialogDescription>
            Cerca e richiedi l'accesso a nuove palestre nella tua zona
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra di ricerca */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o città..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista palestre */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Caricamento palestre...</span>
              </div>
            ) : filteredGyms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nessuna palestra trovata con questi criteri' : 'Tutte le palestre disponibili sono già nel tuo account'}
              </div>
            ) : (
              filteredGyms.map((gym) => (
                <Card key={gym.id} className="hover:shadow-card transition-all duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{gym.name}</CardTitle>
                    <CardDescription>{gym.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-2" />
                      {gym.address}, {gym.city}
                    </div>
                    
                    {gym.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 mr-2" />
                        {gym.email}
                      </div>
                    )}
                    
                    {gym.phone && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="w-4 h-4 mr-2" />
                        {gym.phone}
                      </div>
                    )}

                    <Button
                      onClick={() => requestJoinGym(gym)}
                      disabled={requesting === gym.id}
                      className="w-full"
                      size="sm"
                    >
                      {requesting === gym.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Inviando richiesta...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Richiedi Accesso
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}