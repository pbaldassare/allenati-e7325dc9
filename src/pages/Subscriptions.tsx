import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Clock, Infinity, CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import { getUserActiveSubscriptions } from '@/lib/subscriptionHelpers';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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
  const [activeSubscriptions, setActiveSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null);

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

      // Carica TUTTI gli abbonamenti attivi per la palestra selezionata
      console.log('Loading subscriptions for user:', user.id, 'gym:', selectedGym.id);
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('user_id', user.id)
        .eq('gym_id', selectedGym.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('activated_at', { ascending: false });

      if (subscriptionsError) {
        console.error('Subscriptions query error:', subscriptionsError);
        if (subscriptionsError.code !== 'PGRST116') {
          throw subscriptionsError;
        }
      }
      
      console.log('Active subscriptions loaded:', subscriptionsData);

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
      setActiveSubscriptions(subscriptionsData || []);
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

    // Check if user already has active subscriptions
    if (activeSubscriptions.length > 0) {
      setPendingPlan(plan);
      setShowConfirmDialog(true);
      return;
    }

    // No existing subscriptions - proceed directly
    await processPurchase(plan);
  };

  const processPurchase = async (plan: SubscriptionPlan) => {
    if (!user || !selectedGym) return;

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
        await openCheckoutUrl(data.url);
        
        
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
      setShowConfirmDialog(false);
      setPendingPlan(null);
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

        {/* Crediti disponibili per palestra */}
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

            {/* Griglia piani */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {plans.map((plan) => {
                const isActive = activeSubscriptions.some(sub => sub.plan.id === plan.id);
                
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
                        disabled={changing === plan.id}
                        className="w-full mt-auto"
                        size="sm"
                        variant={isActive ? "outline" : "default"}
                      >
                        {changing === plan.id ? (
                          <>
                            <Loader2 className="w-3 w-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                            <span className="text-xs sm:text-sm">Attivazione...</span>
                          </>
                        ) : isActive ? (
                          <span className="text-xs sm:text-sm">Riacquista</span>
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
            {activeSubscriptions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    I Tuoi Abbonamenti Attivi ({activeSubscriptions.length})
                  </h3>
                </div>
                
                {activeSubscriptions.map((subscription, index) => (
                  <Card key={subscription.id} className={index === 0 ? 'border-primary' : ''}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {getPlanIcon(subscription.plan)}
                          {subscription.plan.name}
                        </span>
                        {index === 0 && <Badge>Più recente</Badge>}
                      </CardTitle>
                      <CardDescription>{subscription.plan.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Attivato:</span>
                          <p className="font-medium">
                            {format(new Date(subscription.starts_at), 'dd MMMM yyyy', { locale: it })}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Scade:</span>
                          <p className="font-medium">
                            {format(new Date(subscription.expires_at), 'dd MMMM yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>
                      
                      {subscription.plan.unlimited_access && (
                        <Badge variant="default" className="w-full justify-center">
                          <Infinity className="w-4 h-4 mr-2" />
                          Accesso Illimitato
                        </Badge>
                      )}
                      
                      {subscription.plan.credits_included > 0 && (
                        <div className="flex items-center justify-between bg-muted p-3 rounded">
                          <span className="text-sm">Crediti inclusi:</span>
                          <span className="font-bold text-lg">{subscription.plan.credits_included}</span>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground text-center">
                        {(() => {
                          const days = Math.ceil((new Date(subscription.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return `${days} giorni rimanenti`;
                        })()}
                      </div>
                      
                      {subscription.plan.features && subscription.plan.features.length > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          <div className="text-sm font-medium text-muted-foreground">Caratteristiche</div>
                          {subscription.plan.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
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

        {/* Dialog conferma acquisto abbonamento multiplo */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Conferma Acquisto Abbonamento Aggiuntivo
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>Hai già <strong>{activeSubscriptions.length}</strong> abbonamento/i attivo/i:</p>
                
                <div className="space-y-2 bg-muted p-3 rounded-lg max-h-40 overflow-y-auto">
                  {activeSubscriptions.map((sub, idx) => (
                    <div key={sub.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{sub.plan.name}</span>
                      <span className="text-muted-foreground">
                        scade {format(new Date(sub.expires_at), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
                
                {pendingPlan && (
                  <>
                    <p className="font-medium">Acquistando "{pendingPlan.name}":</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {pendingPlan.credits_included > 0 && !pendingPlan.unlimited_access && (
                        <li className="text-primary font-medium">
                          I {pendingPlan.credits_included} crediti si cumuleranno ai tuoi crediti attuali
                        </li>
                      )}
                      {(pendingPlan.duration_days >= 30 || pendingPlan.unlimited_access) && (
                        <li>
                          Il nuovo periodo di {pendingPlan.duration_days} giorni partirà da oggi
                        </li>
                      )}
                      {activeSubscriptions.some(s => s.plan.unlimited_access) && (
                        <li>L'accesso illimitato rimarrà attivo</li>
                      )}
                      {pendingPlan.unlimited_access && !activeSubscriptions.some(s => s.plan.unlimited_access) && (
                        <li className="text-primary font-medium">Otterrai accesso illimitato</li>
                      )}
                    </ul>
                  </>
                )}
                
                <p className="text-sm text-muted-foreground pt-2 border-t">
                  Vuoi procedere con l'acquisto?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowConfirmDialog(false);
                setPendingPlan(null);
              }}>
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (pendingPlan) {
                    processPurchase(pendingPlan);
                  }
                }}
                className="bg-primary"
              >
                Conferma Acquisto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}