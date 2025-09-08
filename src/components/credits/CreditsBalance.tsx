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

interface UserCredits {
  current_credits: number;
  active_subscription?: {
    plan_name: string;
    expires_at: string;
    unlimited_access: boolean;
  };
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
        // Get current credits from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_credits')
          .eq('user_id', user.id)
          .single();

        // Get active subscription for selected gym
        const { data: subscription } = await supabase
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
          .single();

        setCreditsData({
          current_credits: profile?.current_credits || 0,
          active_subscription: subscription ? {
            plan_name: subscription.subscription_plans.name,
            expires_at: subscription.expires_at,
            unlimited_access: subscription.subscription_plans.unlimited_access
          } : undefined
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
        {/* Current Credits */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Crediti disponibili</span>
          <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
            {creditsData?.current_credits || 0}
          </Badge>
        </div>

        {/* Active Subscription */}
        {creditsData?.active_subscription && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              {creditsData.active_subscription.unlimited_access ? (
                <Infinity className="h-4 w-4 text-primary" />
              ) : (
                <Calendar className="h-4 w-4 text-primary" />
              )}
              <span className="font-medium text-sm">
                {creditsData.active_subscription.plan_name}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Scade il {new Date(creditsData.active_subscription.expires_at).toLocaleDateString('it-IT')}
            </div>
            {creditsData.active_subscription.unlimited_access && (
              <Badge variant="default" className="text-xs">
                Accesso Illimitato
              </Badge>
            )}
          </div>
        )}

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