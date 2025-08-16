import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  BarChart3,
  Download,
  LogOut
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalBookings: 0,
    revenue: 0,
    popularCourses: [],
    recentActivity: []
  });
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load courses with participant counts
      const { data: coursesData } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:instructors!courses_instructor_id_fkey (
            profiles:user_id (
              first_name,
              last_name
            )
          ),
          course_categories (
            name
          ),
          bookings!inner (
            status
          )
        `)
        .eq('is_active', true)
        .eq('bookings.status', 'confirmed');

      // Load users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .limit(10);

      // Load recent bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Calculate analytics
      const totalUsers = usersData?.length || 0;
      const activeSubscriptions = 0; // Simplified for now
      const totalBookings = bookingsData?.length || 0;
      const revenue = coursesData?.reduce((sum, course) => 
        sum + (course.price_per_session * (course.bookings?.length || 0)), 0
      ) || 0;

      setAnalytics({
        totalUsers,
        activeSubscriptions,
        totalBookings,
        revenue,
        popularCourses: coursesData?.slice(0, 5) || [],
        recentActivity: bookingsData || []
      });

      setCourses(coursesData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const StatsCard = ({ title, value, icon: Icon, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground">
            <span className="text-success">+{trend}%</span> dal mese scorso
          </p>
        )}
      </CardContent>
    </Card>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Utenti Totali"
          value={analytics.totalUsers}
          icon={Users}
          trend={12}
        />
        <StatsCard
          title="Abbonamenti Attivi"
          value={analytics.activeSubscriptions}
          icon={TrendingUp}
          trend={8}
        />
        <StatsCard
          title="Prenotazioni Oggi"
          value={analytics.totalBookings}
          icon={Calendar}
          trend={15}
        />
        <StatsCard
          title="Ricavi Mensili"
          value={`€${analytics.revenue.toLocaleString()}`}
          icon={DollarSign}
          trend={22}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Corsi Più Popolari</CardTitle>
            <CardDescription>Maggiori prenotazioni questo mese</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.popularCourses.map((course: any, index: number) => (
                <div key={course.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium">#{index + 1}</div>
                    <div>
                      <p className="text-sm font-medium">{course.name}</p>
                      <p className="text-xs text-muted-foreground">{course.instructor}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {course.currentParticipants}/{course.maxParticipants}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attività Recente</CardTitle>
            <CardDescription>Ultime prenotazioni e cancellazioni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentActivity.map((booking: any) => (
                <div key={booking.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Prenotazione corso</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge 
                    variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const CoursesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Gestione Corsi</h3>
          <p className="text-sm text-muted-foreground">
            Crea, modifica e gestisci i corsi della palestra
          </p>
        </div>
        <Button className="bg-gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Corso
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Corsi Attivi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Caricamento...</p>
              </div>
            ) : (
              courses.map((course) => {
                const instructorName = course.instructor?.profiles ? 
                  `${course.instructor.profiles.first_name} ${course.instructor.profiles.last_name}` : 
                  'Istruttore non assegnato';
                const currentParticipants = course.bookings?.length || 0;
                const difficultyText = course.difficulty_level === 1 ? 'Principiante' : 
                                     course.difficulty_level === 2 ? 'Intermedio' : 
                                     course.difficulty_level === 3 ? 'Avanzato' : 'Non specificato';

                return (
                  <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img 
                        src={course.image_url || '/placeholder.svg'} 
                        alt={course.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div>
                        <h4 className="font-medium">{course.name}</h4>
                        <p className="text-sm text-muted-foreground">{instructorName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{course.course_categories?.name || 'Senza categoria'}</Badge>
                          <Badge variant="secondary">{difficultyText}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {currentParticipants}/{course.max_participants}
                        </p>
                        <p className="text-xs text-muted-foreground">€{course.price_per_session}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const UsersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Gestione Utenti</h3>
          <p className="text-sm text-muted-foreground">
            Visualizza e gestisci gli utenti registrati
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Esporta Lista
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utenti Registrati</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Caricamento...</p>
              </div>
            ) : (
              users.map((user) => {
                const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Nome non disponibile';
                const subscriptionName = 'Basic'; // Simplified for now

                return (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-medium">
                        {fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-medium">{fullName}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge variant="default">{subscriptionName}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Iscritto: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const MessagesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Sistema Messaggi</h3>
          <p className="text-sm text-muted-foreground">
            Invia comunicazioni agli utenti
          </p>
        </div>
        <Button className="bg-gradient-primary">
          <MessageSquare className="mr-2 h-4 w-4" />
          Nuovo Messaggio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modelli di Messaggio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Benvenuto Nuovo Utente</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Messaggio automatico per nuovi iscritti
              </p>
              <Button variant="outline" size="sm">Usa Template</Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Scadenza Abbonamento</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Promemoria per abbonamenti in scadenza
              </p>
              <Button variant="outline" size="sm">Usa Template</Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Nuovo Corso Disponibile</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Notifica per nuovi corsi aggiunti
              </p>
              <Button variant="outline" size="sm">Usa Template</Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Promemoria Prenotazione</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Reminder automatico per corsi prenotati
              </p>
              <Button variant="outline" size="sm">Usa Template</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const AnalyticsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Analytics & Reports</h3>
          <p className="text-sm text-muted-foreground">
            Analisi dettagliate e report
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Esporta Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tasso di Occupazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">87%</div>
            <p className="text-xs text-muted-foreground">Media settimanale</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Retention Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">92%</div>
            <p className="text-xs text-muted-foreground">Ultimi 3 mesi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Soddisfazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">4.8/5</div>
            <p className="text-xs text-muted-foreground">Rating medio</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Disponibili</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              'Report Presenze Mensili',
              'Analisi Ricavi per Corso',
              'Performance Istruttori',
              'Trend Abbonamenti',
              'Utilizzo Fasce Orarie'
            ].map((report, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{report}</span>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Pannello Amministrativo
              </h1>
              <p className="text-muted-foreground">
                Gestisci la tua palestra e monitora le performance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-gradient-primary text-white">
                Admin
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="courses">Corsi</TabsTrigger>
              <TabsTrigger value="users">Utenti</TabsTrigger>
              <TabsTrigger value="messages">Messaggi</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab />
            </TabsContent>
            
            <TabsContent value="courses">
              <CoursesTab />
            </TabsContent>
            
            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
            
            <TabsContent value="messages">
              <MessagesTab />
            </TabsContent>
            
            <TabsContent value="analytics">
              <AnalyticsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;