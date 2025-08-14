import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Clock, Infinity, CheckCircle } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  credits_included: number;
  unlimited_access: boolean;
  is_trial: boolean;
  is_active: boolean;
  features: string[];
}

interface UserSubscription {
  id: string;
  plan: SubscriptionPlan;
  status: string;
  starts_at: string;
  expires_at: string;
  auto_renew: boolean;
}

export default function Subscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);

  useEffect(() => {
    document.title = 'Abbonamenti | FitApp';
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Carica piani di abbonamento (escludi trial)
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_trial', false)
        .order('price');

      if (plansError) throw plansError;

      // Carica abbonamento corrente
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        throw subscriptionError;
      }

      // Carica crediti utente
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_credits')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      setPlans(plansData || []);
      setCurrentSubscription(subscriptionData);
      setUserCredits(profileData?.current_credits || 0);
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i dati degli abbonamenti',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectPlan = async (plan: SubscriptionPlan) => {
    if (!user || changing) return;

    setChanging(plan.id);

    try {
      // Disattiva abbonamento corrente se esiste
      if (currentSubscription) {
        await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', currentSubscription.id);
      }

      // Calcola date
      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(startsAt.getDate() + plan.duration_days);

      // Crea nuovo abbonamento
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          status: 'active',
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          auto_renew: true,
        });

      if (subscriptionError) throw subscriptionError;

      // Aggiungi crediti se inclusi nel piano
      if (plan.credits_included > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('current_credits')
          .eq('user_id', user.id)
          .single();

        const currentCredits = profileData?.current_credits || 0;
        const newBalance = currentCredits + plan.credits_included;

        await supabase
          .from('profiles')
          .update({ current_credits: newBalance })
          .eq('user_id', user.id);

        await supabase
          .from('credits_transactions')
          .insert({
            user_id: user.id,
            amount: plan.credits_included,
            balance_after: newBalance,
            transaction_type: 'subscription_purchase',
            description: `Crediti da abbonamento ${plan.name}`,
          });
      }

      toast({
        title: 'Abbonamento attivato!',
        description: `Il tuo abbonamento "${plan.name}" è ora attivo.`,
      });

      await loadData();
    } catch (error) {
      console.error('Errore nella selezione del piano:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile attivare l\'abbonamento',
        variant: 'destructive',
      });
    } finally {
      setChanging(null);
    }
  };

  const getPlanIcon = (plan: SubscriptionPlan) => {
    if (plan.unlimited_access) return <Infinity className="w-6 h-6 text-primary" />;
    if (plan.duration_days >= 365) return <Star className="w-6 h-6 text-accent" />;
    return <Clock className="w-6 h-6 text-secondary" />;
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'Gratuito' : `€${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Caricamento...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Gestisci i tuoi Abbonamenti</h1>
          <p className="text-muted-foreground">
            Scegli il piano perfetto per le tue esigenze di fitness
          </p>
        </div>

        {/* Crediti attuali */}
        <Card className="border-primary/20 bg-gradient-primary">
          <CardHeader className="text-center text-primary-foreground">
            <CardTitle className="text-xl">I tuoi Crediti</CardTitle>
            <div className="text-4xl font-bold">{userCredits}</div>
            <CardDescription className="text-primary-foreground/80">
              crediti disponibili
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plans">Piani Disponibili</TabsTrigger>
            <TabsTrigger value="current">Abbonamento Attuale</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-6">
            {/* Nota periodo gratuito */}
            <Card className="border-success/20 bg-success/5">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">
                    Periodo di lancio gratuito - Tutti i piani a 0€!
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Griglia piani */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const isActive = currentSubscription?.plan.id === plan.id;
                
                return (
                  <Card 
                    key={plan.id}
                    className={`relative ${
                      isActive 
                        ? 'border-primary shadow-primary' 
                        : 'hover:border-primary/50 transition-all duration-300'
                    }`}
                  >
                    {isActive && (
                      <Badge className="absolute -top-2 left-4 bg-primary">
                        Attivo
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-2">
                        {getPlanIcon(plan)}
                      </div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="text-2xl font-bold text-primary">
                        {formatPrice(plan.price)}
                      </div>
                      {plan.duration_days && (
                        <div className="text-sm text-muted-foreground">
                          per {plan.duration_days} giorni
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {plan.unlimited_access ? (
                          <div className="flex items-center space-x-2">
                            <Infinity className="w-4 h-4 text-primary" />
                            <span className="text-sm">Accesso illimitato</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{plan.credits_included} crediti inclusi</span>
                          </div>
                        )}

                        {plan.features?.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={() => selectPlan(plan)}
                        disabled={isActive || changing === plan.id}
                        className="w-full"
                        variant={isActive ? "secondary" : "default"}
                      >
                        {changing === plan.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Attivazione...
                          </>
                        ) : isActive ? (
                          'Piano Attivo'
                        ) : (
                          'Seleziona Piano'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="current" className="space-y-6">
            {currentSubscription ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getPlanIcon(currentSubscription.plan)}
                    <span>{currentSubscription.plan.name}</span>
                  </CardTitle>
                  <CardDescription>
                    {currentSubscription.plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Stato</div>
                      <Badge variant="default" className="mt-1">
                        {currentSubscription.status === 'active' ? 'Attivo' : currentSubscription.status}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Scadenza</div>
                      <div className="mt-1">
                        {new Date(currentSubscription.expires_at).toLocaleDateString('it-IT')}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Rinnovo automatico</div>
                      <Badge variant="outline" className="mt-1">
                        {currentSubscription.auto_renew ? 'Attivo' : 'Disattivato'}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Prezzo</div>
                      <div className="mt-1 font-medium">
                        {formatPrice(currentSubscription.plan.price)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Caratteristiche</div>
                    <div className="space-y-1">
                      {currentSubscription.plan.unlimited_access ? (
                        <div className="flex items-center space-x-2">
                          <Infinity className="w-4 h-4 text-primary" />
                          <span className="text-sm">Accesso illimitato a tutti i corsi</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="text-sm">{currentSubscription.plan.credits_included} crediti inclusi</span>
                        </div>
                      )}

                      {currentSubscription.plan.features?.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="space-y-4">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-medium">Nessun abbonamento attivo</h3>
                      <p className="text-muted-foreground">
                        Seleziona un piano dalla scheda "Piani Disponibili" per iniziare
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}