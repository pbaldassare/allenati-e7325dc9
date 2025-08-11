import React, { useEffect, useState } from 'react';
import { Plus, Edit, Eye } from 'lucide-react';
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
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select(`
          *,
          user_gym_memberships!inner(
            user_id,
            profiles!inner(
              first_name,
              last_name,
              phone
            )
          )
        `)
        .eq('user_gym_memberships.membership_type', 'owner')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const gymsWithOwners = (data || []).map((gym: any) => ({
        ...gym,
        owner: gym.user_gym_memberships?.[0]?.profiles
      }));

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
            Gestisci tutte le palestre del sistema
          </p>
        </div>
        <Button 
          onClick={() => navigate('/admin/gyms/new')}
          className="bg-gradient-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuova Palestra
        </Button>
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
              <p className="text-sm mt-1">Inizia creando la prima palestra</p>
            </div>
            <Button 
              onClick={() => navigate('/admin/gyms/new')}
              className="mt-4 bg-gradient-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crea Prima Palestra
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminGyms;