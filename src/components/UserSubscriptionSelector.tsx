import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  credits_included: number;
  unlimited_access: boolean;
  is_trial: boolean;
  features: string[];
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: string;
  expires_at: string;
  plan: SubscriptionPlan;
}

export const UserSubscriptionSelector: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPlansAndSubscription();
  }, []);

  const loadPlansAndSubscription = async () => {
    try {
      // Load available plans (exclude trial plans since free credit is automatic)
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_trial', false)
        .order('price');

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Load current subscription
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            plan:subscription_plans(*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (subError) throw subError;
        setCurrentSubscription(subData);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i piani abbonamento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectPlan = async (planId: string) => {
    try {
      setChanging(planId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      // Deactivate current subscription if exists
      if (currentSubscription) {
        await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', currentSubscription.id);
      }

      // Create new subscription
      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan) throw new Error('Piano non trovato');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedPlan.duration_days);

      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      // Add credits if plan includes them
      if (selectedPlan.credits_included > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_credits')
          .eq('user_id', user.id)
          .single();

        const newBalance = (profile?.current_credits || 0) + selectedPlan.credits_included;

        await supabase
          .from('credits_transactions')
          .insert({
            user_id: user.id,
            amount: selectedPlan.credits_included,
            balance_after: newBalance,
            transaction_type: 'subscription',
            description: `Crediti da abbonamento ${selectedPlan.name}`
          });

        await supabase
          .from('profiles')
          .update({ current_credits: newBalance })
          .eq('user_id', user.id);
      }

      toast({
        title: 'Successo',
        description: `Abbonamento ${selectedPlan.name} attivato con successo!`,
      });

      await loadPlansAndSubscription();
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile cambiare abbonamento',
        variant: 'destructive',
      });
    } finally {
      setChanging(null);
    }
  };

  const getPlanIcon = (plan: SubscriptionPlan) => {
    if (plan.is_trial) return Clock;
    if (plan.unlimited_access) return Zap;
    return Users;
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento piani...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          I Tuoi Abbonamenti
        </h2>
        <p className="text-muted-foreground">
          Scegli l'abbonamento più adatto alle tue esigenze. Puoi cambiarlo in qualsiasi momento.
        </p>
      </div>

      {currentSubscription && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="default">Attivo</Badge>
                {currentSubscription.plan.name}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Scade il {new Date(currentSubscription.expires_at).toLocaleDateString()}
              </div>
            </div>
            <CardDescription>
              {currentSubscription.plan.description}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const Icon = getPlanIcon(plan);
          const isCurrentPlan = currentSubscription?.plan_id === plan.id;
          const isChanging = changing === plan.id;

          return (
            <Card 
              key={plan.id} 
              className={isCurrentPlan ? 'border-primary ring-1 ring-primary' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                  {plan.is_trial && (
                    <Badge variant="secondary">Prova</Badge>
                  )}
                  {isCurrentPlan && (
                    <Badge variant="default">Attivo</Badge>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="text-2xl font-bold">
                  {plan.price === 0 ? 'Gratis' : `€${plan.price}`}
                  <span className="text-sm text-muted-foreground font-normal">
                    /{plan.duration_days} giorni
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.unlimited_access ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Lezioni illimitate</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{plan.credits_included} crediti inclusi</span>
                    </div>
                  )}
                  
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : "default"}
                  disabled={isCurrentPlan || isChanging}
                  onClick={() => selectPlan(plan.id)}
                >
                  {isChanging ? 'Attivazione...' : 
                   isCurrentPlan ? 'Piano Attivo' : 
                   'Seleziona Piano'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Tutti i piani sono attualmente gratuiti durante il periodo di lancio.</p>
        <p>Puoi cambiare o annullare il tuo abbonamento in qualsiasi momento.</p>
      </div>
    </div>
  );
};