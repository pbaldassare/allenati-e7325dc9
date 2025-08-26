import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StripeConnectStatus } from '@/components/ui/StripeConnectStatus';
import { StripeConnectActions } from '@/components/ui/StripeConnectActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Users,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface GymStripeData {
  id: string;
  name: string;
  stripe_connect_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_dashboard_url: string | null;
}

const OwnerStripeConnect = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gym, setGym] = useState<GymStripeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Stripe Connect | Gym Manager';
    loadGymData();
  }, []);

  const loadGymData = async () => {
    try {
      if (!user) return;

      // Get user's gym
      const { data: membership } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('membership_type', 'owner')
        .single();

      if (!membership) {
        toast({
          title: "Errore",
          description: "Nessuna palestra trovata per questo proprietario",
          variant: "destructive",
        });
        return;
      }

      // Get gym with Stripe data
      const { data: gymData, error } = await supabase
        .from('gyms')
        .select(`
          id, 
          name, 
          stripe_connect_account_id,
          stripe_onboarding_complete,
          stripe_charges_enabled,
          stripe_payouts_enabled,
          stripe_dashboard_url
        `)
        .eq('id', membership.gym_id)
        .single();

      if (error) throw error;
      setGym(gymData);
    } catch (error) {
      console.error('Error loading gym data:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati della palestra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = () => {
    loadGymData();
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

  const getStatusAlert = () => {
    if (!gym.stripe_connect_account_id) {
      return {
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        title: 'Account Stripe Connect non configurato',
        description: 'Per accettare pagamenti nella tua palestra, devi configurare un account Stripe Connect. Contatta l\'amministratore per creare l\'account.'
      };
    }

    if (!gym.stripe_onboarding_complete) {
      return {
        variant: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />,
        title: 'Configurazione incompleta',
        description: 'Il tuo account Stripe Connect non è ancora completamente configurato. Completa la configurazione per iniziare ad accettare pagamenti.'
      };
    }

    if (gym.stripe_charges_enabled && gym.stripe_payouts_enabled) {
      return {
        variant: 'default' as const,
        icon: <CheckCircle className="h-4 w-4" />,
        title: 'Account attivo',
        description: 'Il tuo account Stripe Connect è attivo e configurato correttamente. Puoi accettare pagamenti e ricevere payout.'
      };
    }

    return {
      variant: 'default' as const,
      icon: <Info className="h-4 w-4" />,
      title: 'Configurazione in corso',
      description: 'Il tuo account è in fase di verifica. Alcune funzionalità potrebbero non essere ancora disponibili.'
    };
  };

  const statusAlert = getStatusAlert();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Stripe Connect
        </h1>
        <p className="text-muted-foreground">
          Gestisci i pagamenti e le transazioni della tua palestra
        </p>
      </div>

      {/* Status Alert */}
      <Alert variant={statusAlert.variant}>
        {statusAlert.icon}
        <div>
          <div className="font-medium">{statusAlert.title}</div>
          <AlertDescription className="mt-1">
            {statusAlert.description}
          </AlertDescription>
        </div>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Status */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Stato Account</h2>
          
          <StripeConnectStatus
            accountId={gym.stripe_connect_account_id}
            onboardingComplete={gym.stripe_onboarding_complete}
            chargesEnabled={gym.stripe_charges_enabled}
            payoutsEnabled={gym.stripe_payouts_enabled}
            dashboardUrl={gym.stripe_dashboard_url}
            showDetails={true}
          />
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Azioni</h2>
          
          <Card>
            <CardContent className="pt-6">
              <StripeConnectActions
                gymId={gym.id}
                accountId={gym.stripe_connect_account_id}
                onboardingComplete={gym.stripe_onboarding_complete}
                isAdmin={false}
                onStatusUpdate={handleStatusUpdate}
                variant="default"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Cards */}
      {gym.stripe_onboarding_complete && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pagamenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Accetta pagamenti per corsi, abbonamenti e prodotti direttamente nella piattaforma.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Payout Automatici
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ricevi i tuoi guadagni automaticamente sul conto bancario configurato.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Commissioni Trasparenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Commissioni competitive con la massima trasparenza sui costi delle transazioni.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OwnerStripeConnect;