import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, ExternalLink, TrendingUp, TrendingDown, Coins, Activity, Users, Target, PieChart, DollarSign, RefreshCw, Navigation } from 'lucide-react';
import { useTour } from '@/components/AppTourContext';
import { Progress } from '@/components/ui/progress';
import { useOwnerRevenue } from '@/hooks/useOwnerRevenue';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { DebugDataComponent } from '@/components/owner/DebugDataComponent';

interface GymStripeData {
  id: string;
  stripe_credentials_configured: boolean;
}

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { selectedGym } = useOwnerGym();
  const navigate = useNavigate();
  const { startTour } = useTour();
  const isMobile = useIsMobile();
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<number | null>(null);
  const [gymStripeData, setGymStripeData] = useState<GymStripeData | null>(null);
  const [loading, setLoading] = useState(true);
  const { 
    revenueStats, 
    subscriptionStats, 
    totalRevenueStats,
    subscriptionCoverage,
    subscriptionTypeBreakdown,
    loading: revenueLoading 
  } = useOwnerRevenue();

  useEffect(() => {
    document.title = 'Dashboard Proprietario | Gym Manager';
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedGym?.id) {
        setMembersCount(null);
        setUpcomingBookings(null);
        setGymStripeData(null);
        setLoading(false);
        return;
      }

      try {
        // Get gym Stripe data
        const { data: gymData } = await supabase
          .from('gyms')
          .select(`
            id,
            stripe_credentials_configured
          `)
          .eq('id', selectedGym.id)
          .single();

        if (gymData) {
          setGymStripeData(gymData);
        }

        // Count active memberships for this gym
        console.log('🔍 DEBUGGING - About to query user_gym_memberships for:', {
          gymId: selectedGym.id,
          gymName: selectedGym.name,
          timestamp: new Date().toISOString()
        });

        const { count: membersCnt, data: debugData } = await supabase
          .from('user_gym_memberships')
          .select('id, user_id, status', { count: 'exact' })
          .eq('gym_id', selectedGym.id)
          .eq('status', 'active');

        console.log('🔍 DEBUGGING - Memberships query result:', {
          count: membersCnt,
          gymId: selectedGym.id,
          gymName: selectedGym.name,
          records: debugData?.slice(0, 5), // First 5 records for debugging
          totalRecords: debugData?.length,
          timestamp: new Date().toISOString()
        });

        // Get courses for this gym only
        const { data: courses } = await supabase
          .from('courses')
          .select('id')
          .eq('gym_id', selectedGym.id);

        let bookingsCnt: number | null = 0;
        if (courses && courses.length > 0) {
          const courseIds = courses.map((c) => c.id);
          const today = new Date().toISOString().slice(0, 10);
          const { count } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .in('course_id', courseIds)
            .gte('scheduled_date', today);
          bookingsCnt = count ?? 0;
        } else {
          bookingsCnt = 0;
        }

        setMembersCount(membersCnt ?? 0);
        setUpcomingBookings(bookingsCnt);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedGym?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 data-tour="owner-dashboard-title" className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dashboard Proprietario
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-muted-foreground">Riepilogo rapido della tua palestra</p>
          <Button
            onClick={() => startTour('gym_owner')}
            variant="outline"
            size="sm"
            className="text-primary border-primary/20 hover:bg-primary/5"
          >
            <Navigation className="w-4 h-4 mr-1" />
            Tour
          </Button>
          {selectedGym && (
            <div className="flex items-center gap-2 ml-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary">
                  Visualizzando: {selectedGym.name}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>
          )}
        </div>
        
        {/* Gym Status Info */}
        {!selectedGym && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              ⚠️ Nessuna palestra selezionata. Seleziona una palestra dal menu in alto per visualizzare i dati.
            </p>
          </div>
        )}
        
        {selectedGym && membersCount !== null && membersCount < 5 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              💡 <strong>{selectedGym.name}</strong> ha pochi utenti attivi ({membersCount}). 
              {membersCount === 0 && " Considera di invitare nuovi membri!"}
              {membersCount > 0 && membersCount < 5 && " Se gestisci più palestre, verifica di aver selezionato quella corretta."}
            </p>
          </div>
        )}
      </div>

      {/* Debug Component */}
      <DebugDataComponent />

      {/* Stripe Configuration Alert */}
      {gymStripeData && !gymStripeData.stripe_credentials_configured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="font-medium">Configura le credenziali Stripe</div>
              <AlertDescription className="mt-1">
                Inserisci le tue credenziali Stripe per iniziare ad accettare pagamenti per corsi e abbonamenti.
              </AlertDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/owner/stripe')}
              className="ml-4 gap-2"
            >
              <CreditCard className="h-3 w-3" />
              Configura
            </Button>
          </div>
        </Alert>
      )}

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Iscritti attivi</span>
              {selectedGym && (
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedGym.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '—' : membersCount}</div>
            {!loading && membersCount !== null && (
              <p className="text-sm text-muted-foreground mt-1">
                {membersCount === 0 && "Inizia ad aggiungere membri"}
                {membersCount > 0 && membersCount < 10 && "Palestra in crescita"}
                {membersCount >= 10 && membersCount < 50 && "Buona base di membri"}
                {membersCount >= 50 && "Palestra ben popolata"}
              </p>
            )}
            {/* DEBUG INFO */}
            {selectedGym && (
              <div className="mt-2 p-2 bg-muted/20 rounded text-xs border">
                <div className="font-mono text-xs space-y-1">
                  <div>🏢 Gym ID: {selectedGym.id}</div>
                  <div>📊 Count: {membersCount}</div>
                  <div>⏰ {new Date().toLocaleTimeString()}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Prenotazioni imminenti</span>
              {selectedGym && (
                <span className="text-xs text-muted-foreground font-normal">
                  {selectedGym.name}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '—' : upcomingBookings}</div>
            {!loading && upcomingBookings !== null && (
              <p className="text-sm text-muted-foreground mt-1">
                {upcomingBookings === 0 && "Nessuna prenotazione"}
                {upcomingBookings > 0 && `${upcomingBookings} prenotazioni future`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stripe Configuration Card */}
        {gymStripeData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pagamenti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                {gymStripeData.stripe_credentials_configured 
                  ? "Credenziali configurate" 
                  : "Configurazione richiesta"
                }
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/owner/stripe')}
                className="w-full gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                Gestisci
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Revenue and Subscription Statistics */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {/* Total Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Ricavi Totali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueLoading ? '—' : `€${totalRevenueStats.totalRevenue.toFixed(2)}`}
            </div>
            {!revenueLoading && (
              <div className={`text-sm flex items-center gap-1 ${
                totalRevenueStats.monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {totalRevenueStats.monthlyTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(totalRevenueStats.monthlyTrend).toFixed(1)}% vs mese scorso
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Ricavi Mese
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueLoading ? '—' : `€${revenueStats.monthlyRevenue.toFixed(2)}`}
            </div>
            <div className="text-sm text-muted-foreground">
              {revenueLoading ? '—' : subscriptionStats.totalActiveSubscriptions} abbonamenti attivi
            </div>
          </CardContent>
        </Card>

        {/* Subscription Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Copertura Abbonamenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueLoading ? '—' : `${subscriptionCoverage.coveragePercentage.toFixed(1)}%`}
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {revenueLoading ? '—' : `${subscriptionCoverage.usersWithSubscriptions} di ${subscriptionCoverage.totalNormalUsers} utenti`}
            </div>
            {!revenueLoading && (
              <Progress value={subscriptionCoverage.coveragePercentage} className="h-2" />
            )}
          </CardContent>
        </Card>

        {/* Subscription Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Tipi Abbonamenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="text-sm text-muted-foreground">Caricamento...</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(subscriptionTypeBreakdown).length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nessun abbonamento attivo</div>
                ) : (
                  Object.entries(subscriptionTypeBreakdown)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 3)
                    .map(([type, data]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="truncate">{data.name}</span>
                        <span className="font-medium">{data.count}</span>
                      </div>
                    ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown Section */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {/* Weekly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ricavi Settimana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueLoading ? '—' : `€${revenueStats.weeklyRevenue.toFixed(2)}`}
            </div>
            {!revenueLoading && (
              <div className={`text-sm flex items-center gap-1 ${
                revenueStats.weeklyTrend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {revenueStats.weeklyTrend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(revenueStats.weeklyTrend).toFixed(1)}% vs settimana scorsa
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Nuovi Abbonamenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueLoading ? '—' : subscriptionStats.newSubscriptionsThisMonth}
            </div>
            <div className="text-sm text-muted-foreground">
              questo mese
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown Ricavi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Abbonamenti:</span>
                <span className="font-medium">€{revenueLoading ? '—' : subscriptionStats.monthlySubscriptionRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pagamenti singoli:</span>
                <span className="font-medium">€{revenueLoading ? '—' : subscriptionStats.monthlyOneTimeRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-semibold">Totale:</span>
                <span className="font-semibold">€{revenueLoading ? '—' : subscriptionStats.revenueBreakdown.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;
