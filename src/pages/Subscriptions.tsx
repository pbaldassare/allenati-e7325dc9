import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Clock, Infinity, CheckCircle, ArrowLeft } from 'lucide-react';

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
  gym_id: string | null;
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
  const { selectedGym } = useGym();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);

  useEffect(() => {
    document.title = 'Abbonamenti | FitApp';
    loadData();
  }, [user, selectedGym]);

  // Auto-refresh data if user just returned from payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const cancelled = urlParams.get('cancelled');
    
    if (success === 'true') {
      // Remove query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload data to show updated subscription
      loadData();
      toast({
        title: "Pagamento completato!",
        description: "Il tuo abbonamento è stato attivato con successo.",
      });
    } else if (cancelled === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
      toast({
        title: "Pagamento annullato",
        description: "Il pagamento è stato annullato.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadData = async () => {
    if (!user || !selectedGym) return;

    try {
      // Carica solo i piani specifici della palestra selezionata
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_trial', false)
        .eq('gym_id', selectedGym.id)
        .order('price');

      if (plansError) throw plansError;

      // Carica abbonamento corrente per la palestra selezionata
      console.log('Loading subscription for user:', user.id, 'gym:', selectedGym.id);
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('gym_id', selectedGym.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError) {
        console.error('Subscription query error:', subscriptionError);
        // Non lanciare errore se semplicemente non c'è abbonamento
        if (subscriptionError.code !== 'PGRST116') {
          throw subscriptionError;
        }
      }
      
      console.log('Subscription data loaded:', subscriptionData);

      // Carica crediti utente per la palestra selezionata
      const { data: creditsData, error: creditsError } = await supabase
        .from('gym_credits')
        .select('credits')
        .eq('user_id', user.id)
        .eq('gym_id', selectedGym.id)
        .single();

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Credits error:', creditsError);
      }

      setPlans(plansData || []);
      setCurrentSubscription(subscriptionData);
      setUserCredits(creditsData?.credits || 0);
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
    if (!user || !selectedGym || changing) return;

    setChanging(plan.id);

    try {
      console.log('Creating subscription payment for plan:', plan.id);
      
      const { data, error } = await supabase.functions.invoke('create-subscription-payment', {
        body: {
          planId: plan.id,
          gymId: selectedGym.id
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Pagamento in corso",
          description: "Ti abbiamo reindirizzato al pagamento. Torna qui dopo aver completato l'acquisto.",
        });
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating subscription payment:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante la creazione del pagamento',
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
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header con tasto indietro */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Back button clicked, navigating to home');
              navigate('/', { replace: true });
            }}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
            Torna indietro
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Gestisci Abbonamenti</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Scegli il piano perfetto per {selectedGym?.name}
            </p>
          </div>
        </div>

        {/* Crediti attuali per palestra */}
        <Card className="border-primary/20 bg-gradient-primary">
          <CardHeader className="text-center text-primary-foreground">
            <CardTitle className="text-xl">I tuoi Crediti</CardTitle>
            <div className="text-4xl font-bold">{userCredits}</div>
            <CardDescription className="text-primary-foreground/80">
              crediti disponibili per {selectedGym?.name}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {plans.map((plan) => {
                const isActive = currentSubscription?.plan.id === plan.id;
                
                return (
                  <Card 
                    key={plan.id}
                    className={`relative flex flex-col ${
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

                    
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-2">
                        {getPlanIcon(plan)}
                      </div>
                      <CardTitle className="text-base sm:text-lg">{plan.name}</CardTitle>
                      <CardDescription className="text-sm">{plan.description}</CardDescription>
                      <div className="text-xl sm:text-2xl font-bold text-primary">
                        {formatPrice(plan.price)}
                      </div>
                      {plan.duration_days && (
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          per {plan.duration_days} giorni
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4 flex-1 flex flex-col">
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
                        className="w-full mt-auto"
                        size="sm"
                        variant={isActive ? "secondary" : "default"}
                      >
                        {changing === plan.id ? (
                          <>
                            <Loader2 className="w-3 w-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                            <span className="text-xs sm:text-sm">Attivazione...</span>
                          </>
                        ) : isActive ? (
                          <span className="text-xs sm:text-sm">Piano Attivo</span>
                        ) : (
                          <span className="text-xs sm:text-sm">Seleziona Piano</span>
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