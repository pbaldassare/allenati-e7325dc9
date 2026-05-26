import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Calendar, Infinity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';

interface CreditsBalanceProps {
  onPurchaseClick?: () => void;
}

interface ActiveSubscription {
  plan_name: string;
  expires_at: string;
  unlimited_access: boolean;
}

interface UserCredits {
  current_credits: number;
  active_subscriptions: ActiveSubscription[];
}

export const CreditsBalance = ({ onPurchaseClick }: CreditsBalanceProps) => {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const [creditsData, setCreditsData] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !selectedGym) return;

    const fetchCreditsData = async () => {
      try {
        // Get gym-specific credits
        const { data: gymCredits } = await supabase
          .from('gym_credits')
          .select('credits')
          .eq('user_id', user.id)
          .eq('gym_id', selectedGym.id)
          .single();

        // Get all active subscriptions for selected gym
        // (user may have multiple active subscriptions, e.g. Mensile + Quota Iscrizione)
        const { data: subscriptions } = await supabase
          .from('user_subscriptions')
          .select(`
            expires_at,
            subscription_plans!inner(
              name,
              unlimited_access
            )
          `)
          .eq('user_id', user.id)
          .eq('gym_id', selectedGym.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: false });

        const activeSubscriptions = (subscriptions || [])
          .map((subscription) => ({
            plan_name: subscription.subscription_plans.name,
            expires_at: subscription.expires_at,
            unlimited_access: subscription.subscription_plans.unlimited_access,
          }))
          .sort((a, b) => {
            if (a.unlimited_access !== b.unlimited_access) {
              return a.unlimited_access ? -1 : 1;
            }

            return new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime();
          });

        setCreditsData({
          current_credits: gymCredits?.credits || 0,
          active_subscriptions: activeSubscriptions,
        });
      } catch (error) {
        console.error('Error fetching credits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreditsData();
  }, [user, selectedGym]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-pulse">Caricamento...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          I Tuoi Crediti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Crediti Disponibili */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Crediti disponibili</span>
          <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
            {creditsData?.current_credits || 0}
          </Badge>
        </div>

        {/* Active Subscriptions */}
        {creditsData?.active_subscriptions.length ? (
          <div className="space-y-2">
            {creditsData.active_subscriptions.map((subscription) => (
              <div key={`${subscription.plan_name}-${subscription.expires_at}`} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  {subscription.unlimited_access ? (
                    <Infinity className="h-4 w-4 text-primary" />
                  ) : (
                    <Calendar className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-medium text-sm">
                    {subscription.plan_name}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Scade il {new Date(subscription.expires_at).toLocaleDateString('it-IT')}
                </div>
                {subscription.unlimited_access && (
                  <Badge variant="default" className="text-xs">
                    Accesso Illimitato
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Purchase Button */}
        {onPurchaseClick && (
          <button
            onClick={onPurchaseClick}
            className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
          >
            Acquista Crediti
          </button>
        )}
      </CardContent>
    </Card>
  );
};