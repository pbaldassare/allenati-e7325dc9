
import React, { useEffect, useState } from 'react';
import { Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Gym {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  owner_email?: string;
  is_active: boolean;
  created_at: string;
  user_gym_memberships?: Array<{
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
      phone?: string;
    };
  }>;
  owner?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

const AdminGyms = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async () => {
    setLoading(true);
    try {
      console.log('[AdminGyms] Loading gyms...');
      // 1) Carica tutte le palestre (visibili per admin o attive per utenti)
      const { data: gymsData, error: gymsError } = await supabase
        .from('gyms')
        .select('*')
        .order('created_at', { ascending: false });

      if (gymsError) throw gymsError;

      const gymIds = (gymsData || []).map(g => g.id);
      console.log('[AdminGyms] Fetched gyms:', gymsData);

      if (gymIds.length === 0) {
        setGyms([]);
        return;
      }

      // 2) Carica membership tipo "owner" per queste palestre
      const { data: ownerMemberships, error: membershipsError } = await supabase
        .from('user_gym_memberships')
        .select('user_id, gym_id, membership_type, status')
        .in('gym_id', gymIds)
        .eq('membership_type', 'owner')
        .eq('status', 'active');

      if (membershipsError) throw membershipsError;
      console.log('[AdminGyms] Owner memberships:', ownerMemberships);

      const ownerUserIds = Array.from(new Set((ownerMemberships || []).map(m => m.user_id)));
      let profilesMap: Record<string, { first_name: string; last_name: string; phone?: string }> = {};

      // 3) Carica i profili degli owner
      if (ownerUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, phone')
          .in('user_id', ownerUserIds);

        if (profilesError) throw profilesError;

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = {
            first_name: p.first_name,
            last_name: p.last_name,
            phone: p.phone || undefined,
          };
          return acc;
        }, {} as Record<string, { first_name: string; last_name: string; phone?: string }>);
        console.log('[AdminGyms] Owner profiles map:', profilesMap);
      }

      // 4) Combina: per ogni palestra cerca la membership owner e poi il relativo profilo
      const gymsWithOwners: Gym[] = (gymsData || []).map((gym: any) => {
        const membership = (ownerMemberships || []).find(m => m.gym_id === gym.id);
        const profile = membership ? profilesMap[membership.user_id] : undefined;

        return {
          ...gym,
          owner: profile
            ? {
                first_name: profile.first_name,
                last_name: profile.last_name,
                phone: profile.phone,
              }
            : undefined,
        } as Gym;
      });

      setGyms(gymsWithOwners);
    } catch (error) {
      console.error('Error loading gyms:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le palestre',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">Caricamento palestre...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Palestre
          </h1>
          <p className="text-muted-foreground">
            Visualizza e modifica le palestre esistenti
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {gyms.map((gym) => (
          <Card key={gym.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{gym.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {gym.city} • {gym.address}
                  </CardDescription>
                </div>
                <Badge variant={gym.is_active ? "default" : "secondary"}>
                  {gym.is_active ? "Attiva" : "Inattiva"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {gym.description}
                </p>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                   {gym.owner && (
                     <div className="text-sm font-medium text-foreground mb-2">
                       👤 {gym.owner.first_name} {gym.owner.last_name}
                       {gym.owner.phone && ` • ${gym.owner.phone}`}
                     </div>
                   )}
                   {gym.phone && <div>📞 {gym.phone}</div>}
                   {gym.email && <div>✉️ {gym.email}</div>}
                   {gym.website && (
                     <div>🌐 <a href={gym.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                       {gym.website}
                     </a></div>
                   )}
                 </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/gyms/${gym.id}`)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Dettagli
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/gyms/${gym.id}/edit`)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifica
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {gyms.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground text-center">
              <div className="text-4xl mb-4">🏋️</div>
              <h3 className="text-lg font-medium">Nessuna palestra trovata</h3>
              <p className="text-sm mt-1">Per creare una nuova palestra, vai nella sezione "Utenti" e assegna il ruolo "gym_owner" a un utente</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminGyms;
