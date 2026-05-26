import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Calendar, Infinity } from 'lucide-react';

interface UserSubscription {
  id: string;
  plan: {
    name: string;
    unlimited_access: boolean;
    expires_at?: string;
  };
  expires_at: string;
  status: string;
}

export default function CreditsSubscriptionCard() {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<number>(0);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && selectedGym) {
      loadData();
    }
  }, [user, selectedGym]);

  const loadData = async () => {
    if (!user || !selectedGym) return;

    try {
      // Carica crediti per la palestra selezionata
      const { data: creditsData } = await supabase
        .from('gym_credits')
        .select('credits')
        .eq('user_id', user.id)
        .eq('gym_id', selectedGym.id)
        .single();

      // Carica abbonamento attivo per la palestra selezionata
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          expires_at,
          status,
          plan:subscription_plans(
            name,
            unlimited_access
          )
        `)
        .eq('user_id', user.id)
        .eq('gym_id', selectedGym.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCredits(creditsData?.credits || 0);
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Errore nel caricamento dati crediti/abbonamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscriptions = () => {
    navigate('/subscriptions');
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return 'Nessun abbonamento';
    
    if (subscription.plan.unlimited_access) {
      return (
        <div className="flex items-center space-x-1">
          <Infinity className="w-4 h-4 text-primary" />
          <span>{subscription.plan.name}</span>
        </div>
      );
    }
    
    return subscription.plan.name;
  };

  const getExpirationInfo = () => {
    if (!subscription) return null;
    
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Scaduto
        </Badge>
      );
    } else if (daysLeft <= 7) {
      return (
        <Badge variant="destructive" className="text-xs">
          Scade tra {daysLeft} {daysLeft === 1 ? 'giorno' : 'giorni'}
        </Badge>
      );
    } else if (daysLeft <= 30) {
      return (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
          Scade tra {daysLeft} giorni
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="text-xs">
          Attivo ({daysLeft} giorni)
        </Badge>
      );
    }
  };

  return (
    <Card className="hover:shadow-card transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Crediti & Abbonamento</CardTitle>
        <Coins className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Crediti */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-primary">{credits}</div>
            <p className="text-xs text-muted-foreground">crediti disponibili</p>
          </div>
        </div>

        {/* Abbonamento */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-sm font-medium">
              {getSubscriptionStatus()}
            </span>
          </div>
          {getExpirationInfo() && (
            <div className="ml-5">
              {getExpirationInfo()}
            </div>
          )}
        </div>

        <Button
          onClick={handleManageSubscriptions}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Gestisci Crediti e Abbonamenti
        </Button>
      </CardContent>
    </Card>
  );
}