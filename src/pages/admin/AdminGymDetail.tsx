import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Edit, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Users, 
  GraduationCap, 
  Calendar,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GymDetail {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  is_active: boolean;
  created_at: string;
  owner_email: string;
  owner_name?: string;
  total_members: number;
  active_courses: number;
  total_instructors: number;
  stripe_credentials_configured?: boolean;
}

const AdminGymDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gym, setGym] = useState<GymDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadGymDetail();
    }
  }, [id]);

  const loadGymDetail = async () => {
    try {
      // Fetch gym basic info
      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .select(`
          *,
          stripe_credentials_configured
        `)
        .eq('id', id)
        .single();

      if (gymError) throw gymError;

      // Fetch owner info
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('email', gymData.owner_email)
        .single();

      // Count members
      const { count: membersCount } = await supabase
        .from('user_gym_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', id)
        .eq('status', 'active');

      // Count active courses
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', id)
        .eq('is_active', true);

      // Count instructors
      const { count: instructorsCount } = await supabase
        .from('instructors')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', id)
        .eq('is_active', true);

      setGym({
        ...gymData,
        owner_name: ownerData ? `${ownerData.first_name} ${ownerData.last_name}` : 'N/A',
        total_members: membersCount || 0,
        active_courses: coursesCount || 0,
        total_instructors: instructorsCount || 0,
      });
    } catch (error) {
      console.error('Error loading gym details:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli della palestra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Palestra non trovata</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/gyms')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alle palestre
          </Button>
        </div>
        <Button
          onClick={() => navigate(`/admin/gyms/${id}/edit`)}
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Modifica
        </Button>
      </div>

      {/* Main Info */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={gym.logo_url} alt={gym.name} />
                <AvatarFallback className="text-lg font-semibold">
                  {gym.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{gym.name}</CardTitle>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={gym.is_active ? "default" : "secondary"} className="gap-1">
                    {gym.is_active ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {gym.is_active ? 'Attiva' : 'Inattiva'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Description */}
          {gym.description && (
            <div>
              <h3 className="font-semibold mb-2">Descrizione</h3>
              <p className="text-muted-foreground">{gym.description}</p>
            </div>
          )}

          <Separator />

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Informazioni di contatto
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{gym.address}</div>
                    <div className="text-sm text-muted-foreground">
                      {gym.city} {gym.postal_code}
                    </div>
                  </div>
                </div>
                
                {gym.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{gym.phone}</span>
                  </div>
                )}
                
                {gym.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{gym.email}</span>
                  </div>
                )}
                
                {gym.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={gym.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {gym.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Proprietario</h3>
              <div className="space-y-2">
                <div className="font-medium">{gym.owner_name}</div>
                <div className="text-sm text-muted-foreground">{gym.owner_email}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Statistics */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Statistiche
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{gym.total_members}</div>
                    <div className="text-sm text-muted-foreground">Membri attivi</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{gym.active_courses}</div>
                    <div className="text-sm text-muted-foreground">Corsi attivi</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <GraduationCap className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-2xl font-bold">{gym.total_instructors}</div>
                    <div className="text-sm text-muted-foreground">Istruttori</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Stripe Configuration Section */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Configurazione Stripe
            </h3>
            
            <div className="flex items-center gap-2">
              {gym.stripe_credentials_configured ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Credenziali Stripe configurate</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">Credenziali Stripe non configurate</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Created date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Registrata il {new Date(gym.created_at).toLocaleDateString('it-IT')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGymDetail;