import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Users, BookOpen, Calendar, BarChart3, Download } from 'lucide-react';

interface Analytics {
  totalUsers: number;
  totalBookings: number;
  totalCourses: number;
  activeUsers: number;
  bookingsThisMonth: number;
  coursesThisMonth: number;
}

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    totalBookings: 0,
    totalCourses: 0,
    activeUsers: 0,
    bookingsThisMonth: 0,
    coursesThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      // Total users
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (usersError) throw usersError;

      // Total bookings
      const { count: totalBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });
      
      if (bookingsError) throw bookingsError;

      // Total courses
      const { count: totalCourses, error: coursesError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      if (coursesError) throw coursesError;

      // Active users (users with recent bookings)
      const { count: activeUsers, error: activeUsersError } = await supabase
        .from('bookings')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      if (activeUsersError) throw activeUsersError;

      // Bookings this month
      const { count: bookingsThisMonth, error: bookingsMonthError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());
      
      if (bookingsMonthError) throw bookingsMonthError;

      // Courses this month
      const { count: coursesThisMonth, error: coursesMonthError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());
      
      if (coursesMonthError) throw coursesMonthError;

      setAnalytics({
        totalUsers: totalUsers || 0,
        totalBookings: totalBookings || 0,
        totalCourses: totalCourses || 0,
        activeUsers: activeUsers || 0,
        bookingsThisMonth: bookingsThisMonth || 0,
        coursesThisMonth: coursesThisMonth || 0,
      });

    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare le statistiche",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento statistiche...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Analytics & Report
            </h1>
            <p className="text-muted-foreground">
              Statistiche e report dettagliati del sistema
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
                <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
                <SelectItem value="90d">Ultimi 90 giorni</SelectItem>
                <SelectItem value="1y">Ultimo anno</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.activeUsers} attivi negli ultimi 30 giorni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prenotazioni Totali</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                +{analytics.bookingsThisMonth} questo mese
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Corsi Attivi</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalCourses}</div>
              <p className="text-xs text-muted-foreground">
                +{analytics.coursesThisMonth} creati questo mese
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Statistiche Corsi
              </CardTitle>
              <CardDescription>
                Performance e utilizzo dei corsi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Corsi più prenotati</span>
                  <Button variant="ghost" size="sm">Visualizza tutti</Button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Yoga Mattutino</span>
                    <span className="font-medium">247 prenotazioni</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>CrossFit Avanzato</span>
                    <span className="font-medium">198 prenotazioni</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Pilates Base</span>
                    <span className="font-medium">156 prenotazioni</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Report Prenotazioni
              </CardTitle>
              <CardDescription>
                Andamento delle prenotazioni nel tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tasso di completamento</span>
                  <span className="text-sm font-bold text-success">85%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tasso di cancellazione</span>
                  <span className="text-sm font-bold text-warning">12%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">No-show</span>
                  <span className="text-sm font-bold text-destructive">3%</span>
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="w-full">
                    Visualizza Report Dettagliato
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Performance Istruttori</CardTitle>
            <CardDescription>
              Valutazioni e statistiche degli istruttori
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Marco Rossi</div>
                  <div className="text-xs text-muted-foreground">Yoga & Pilates</div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-bold">4.8/5</div>
                    <div className="text-xs text-muted-foreground">127 recensioni</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-medium">Laura Bianchi</div>
                  <div className="text-xs text-muted-foreground">CrossFit</div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-bold">4.7/5</div>
                    <div className="text-xs text-muted-foreground">89 recensioni</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Giuseppe Verdi</div>
                  <div className="text-xs text-muted-foreground">Nuoto</div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-bold">4.9/5</div>
                    <div className="text-xs text-muted-foreground">76 recensioni</div>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4">
                Visualizza Report Completo Istruttori
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;