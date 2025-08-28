
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Calendar, Infinity, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  gym_id: string | null;
}

interface CreditsPurchaseProps {
  onPurchaseComplete?: () => void;
}

export const CreditsPurchase = ({ onPurchaseComplete }: CreditsPurchaseProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price');

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i piani disponibili",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [toast]);

  const handlePurchase = async (plan: SubscriptionPlan) => {
    if (!user) return;

    setPurchasing(plan.id);
    try {
      if (plan.unlimited_access || plan.credits_included > 0) {
        // This is a subscription plan
        console.log('Creating subscription payment for plan:', plan.id);
        
        const { data, error } = await supabase.functions.invoke('create-subscription-payment', {
          body: {
            planId: plan.id,
            gymId: plan.gym_id // Assuming gym_id is available in plan
          }
        });
        
        if (error) throw error;
        
        if (data?.url) {
          window.open(data.url, '_blank');
          
          toast({
            title: "Pagamento in corso",
            description: "Ti abbiamo reindirizzato al pagamento. Torna qui dopo aver completato l'acquisto.",
          });
        }
      }

      onPurchaseComplete?.();
    } catch (error) {
      console.error('Error purchasing plan:', error);
      toast({
        title: "Errore nell'acquisto",
        description: "Si è verificato un errore durante l'acquisto. Riprova.",
        variant: "destructive"
      });
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Acquista Crediti o Abbonamenti</h2>
        <p className="text-muted-foreground">
          Scegli il piano più adatto alle tue esigenze
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.is_trial ? 'border-primary' : ''}`}>
            {plan.is_trial && (
              <Badge className="absolute -top-2 left-4 bg-primary">
                Benvenuto
              </Badge>
            )}
            
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                {plan.unlimited_access ? (
                  <Infinity className="h-5 w-5 text-primary" />
                ) : (
                  <Coins className="h-5 w-5 text-primary" />
                )}
                {plan.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {plan.price === 0 ? 'Gratis' : `€${plan.price}`}
                </div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {plan.duration_days} giorni
                </div>
              </div>

              <div className="space-y-2">
                {(plan.features || []).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handlePurchase(plan)}
                disabled={purchasing === plan.id}
                className="w-full"
                variant={plan.is_trial ? "default" : "outline"}
              >
                {purchasing === plan.id ? (
                  "Attivazione..."
                ) : plan.unlimited_access ? (
                  "Attiva Abbonamento"
                ) : (
                  `Acquista ${plan.credits_included} Crediti`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
