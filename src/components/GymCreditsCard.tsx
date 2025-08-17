import React, { useState, useEffect } from 'react';
import { useGym } from '@/contexts/GymContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, Calendar, Plus, Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface GymCreditsData {
  credits: number;
  subscriptionName?: string;
  subscriptionExpiry?: string;
  subscriptionStatus?: string;
}

export function GymCreditsCard() {
  const { selectedGym } = useGym();
  const { user } = useAuth();
  const [creditsData, setCreditsData] = useState<GymCreditsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGymCreditsData = async () => {
    if (!user || !selectedGym) {
      setCreditsData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch gym credits
      const { data: gymCredits } = await supabase
        .from('gym_credits')
        .select('credits')
        .eq('user_id', user.id)
        .eq('gym_id', selectedGym.id)
        .single();

      // Fetch active subscription for this gym
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`
          status,
          expires_at,
          subscription_plans (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('gym_id', selectedGym.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .single();

      setCreditsData({
        credits: gymCredits?.credits || 0,
        subscriptionName: subscription?.subscription_plans?.name,
        subscriptionExpiry: subscription?.expires_at,
        subscriptionStatus: subscription?.status,
      });

    } catch (error) {
      console.error('Error fetching gym credits data:', error);
      setCreditsData({ credits: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGymCreditsData();
  }, [user, selectedGym]);

  if (!selectedGym) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Seleziona una palestra</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          {selectedGym.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credits Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <span className="font-medium">Crediti disponibili</span>
          </div>
          <Badge variant={creditsData?.credits > 0 ? "default" : "secondary"} className="text-lg px-3 py-1">
            {creditsData?.credits || 0}
          </Badge>
        </div>

        {/* Subscription Section */}
        {creditsData?.subscriptionName ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <span className="font-medium">Abbonamento attivo</span>
            </div>
            <div className="pl-7 space-y-1">
              <p className="text-sm font-medium">{creditsData.subscriptionName}</p>
              {creditsData.subscriptionExpiry && (
                <p className="text-xs text-muted-foreground">
                  Scade il {formatExpiryDate(creditsData.subscriptionExpiry)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Nessun abbonamento attivo</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => {
              // Navigate to subscription page for this gym
              window.location.href = `/subscriptions?gym=${selectedGym.id}`;
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Acquista
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}