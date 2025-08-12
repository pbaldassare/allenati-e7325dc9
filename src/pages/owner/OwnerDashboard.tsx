import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const OwnerDashboard = () => {
  const [membersCount, setMembersCount] = useState<number | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard Proprietario | Gym Manager';
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dashboard Proprietario
        </h1>
        <p className="text-muted-foreground">Riepilogo rapido della tua palestra</p>
      </div>

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
      </div>
    </div>
  );
};

export default OwnerDashboard;
