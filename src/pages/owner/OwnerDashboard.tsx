import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, ExternalLink, TrendingUp, TrendingDown, Coins, Activity, Users, Target, PieChart, DollarSign } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useOwnerRevenue } from '@/hooks/useOwnerRevenue';

interface GymStripeData {
  id: string;
  stripe_credentials_configured: boolean;
}

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      try {
        if (!user) return;

        // Get user's gym to fetch Stripe data
        const { data: membership } = await supabase
          .from('user_gym_memberships')
          .select('gym_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('membership_type', 'owner')
          .single();

        if (membership) {
          // Get gym Stripe data
          const { data: gymData } = await supabase
            .from('gyms')
            .select(`
              id,
              stripe_credentials_configured
            `)
            .eq('id', membership.gym_id)
            .single();

          if (gymData) {
            setGymStripeData(gymData);
          }
        }

        // Count active memberships for this owner's gym (RLS restricts automatically)
        const { count: membersCnt } = await supabase
          .from('user_gym_memberships')
          .select('id', { count: 'exact', head: true });

        // Get courses for this gym only
        const { data: courses } = await supabase
          .from('courses')
          .select('id')
          .eq('gym_id', membership?.gym_id);

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
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dashboard Proprietario
        </h1>
        <p className="text-muted-foreground">Riepilogo rapido della tua palestra</p>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Iscritti attivi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '—' : membersCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prenotazioni imminenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '—' : upcomingBookings}</div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
