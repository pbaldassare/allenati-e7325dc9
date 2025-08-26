
import React, { useEffect, useState } from 'react';
import { Edit, Eye, Building2, MapPin, Phone, Mail, Globe, User, Calendar, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

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
          <Card key={gym.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {gym.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {gym.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {gym.city}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge 
                    variant={gym.is_active ? "default" : "secondary"}
                    className={gym.is_active ? "bg-success/10 text-success border-success/20" : ""}
                  >
                    {gym.is_active ? "Attiva" : "Inattiva"}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(gym.created_at).toLocaleDateString('it-IT', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Description */}
                {gym.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {gym.description}
                  </p>
                )}

                {/* Owner info */}
                {gym.owner && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {gym.owner.first_name} {gym.owner.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">Proprietario</p>
                    </div>
                    {gym.owner.phone && (
                      <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {gym.owner.phone}
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">{gym.address}</p>
                      <p className="text-muted-foreground">{gym.city}</p>
                    </div>
                  </div>
                  
                  {gym.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="text-sm">{gym.phone}</span>
                    </div>
                  )}
                  
                  {gym.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="text-sm truncate">{gym.email}</span>
                    </div>
                  )}
                  
                  {gym.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-primary" />
                      <a 
                        href={gym.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-primary hover:underline truncate"
                      >
                        {gym.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/gyms/${gym.id}`)}
                    className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Dettagli
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/gyms/${gym.id}/edit`)}
                    className="flex-1 hover:bg-secondary hover:text-secondary-foreground transition-colors"
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
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-muted-foreground text-center">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Nessuna palestra trovata</h3>
              <p className="text-sm max-w-md">
                Per creare una nuova palestra, vai nella sezione "Utenti" e assegna il ruolo "gym_owner" a un utente
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminGyms;
