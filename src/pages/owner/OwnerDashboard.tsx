import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { StripeConnectStatus } from '@/components/ui/StripeConnectStatus';
import { StripeConnectActions } from '@/components/ui/StripeConnectActions';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, ExternalLink } from 'lucide-react';

interface GymStripeData {
  id: string;
  stripe_connect_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
}

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<number | null>(null);
  const [gymStripeData, setGymStripeData] = useState<GymStripeData | null>(null);
  const [loading, setLoading] = useState(true);

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
              stripe_connect_account_id,
              stripe_onboarding_complete,
              stripe_charges_enabled,
              stripe_payouts_enabled
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

        // Get courses for this gym
        const { data: courses } = await supabase
          .from('courses')
          .select('id');

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

      {/* Stripe Connect Alert */}
      {gymStripeData && !gymStripeData.stripe_onboarding_complete && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="font-medium">Configura Stripe Connect</div>
              <AlertDescription className="mt-1">
                {!gymStripeData.stripe_connect_account_id 
                  ? "Contatta l'amministratore per creare l'account Stripe Connect."
                  : "Completa la configurazione Stripe Connect per accettare pagamenti."
                }
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

        {/* Stripe Connect Card */}
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
                {gymStripeData.stripe_onboarding_complete 
                  ? "Account configurato" 
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
    </div>
  );
};

export default OwnerDashboard;
