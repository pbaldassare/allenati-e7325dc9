import React, { useState } from 'react';
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
  Activity,
  Target
} from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAnalytics, AnalyticsFilters } from '@/hooks/useAnalytics';
import { KPICards } from '@/components/admin/KPICards';
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts';
import { AnalyticsFilters as AnalyticsFiltersComponent } from '@/components/admin/AnalyticsFilters';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { getAllUsers, courses, bookings } = useAppData();
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>({ period: 'month' });
  const { analytics, loading: analyticsLoading, error: analyticsError, refetch } = useAnalytics(analyticsFilters);
  const { toast } = useToast();
  const users = getAllUsers();

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

  const handleExportAnalytics = () => {
    if (!analytics) return;
    
    const csvData = [
      ['Metrica', 'Valore'],
      ['Utenti Totali', analytics.totalUsers],
      ['Abbonamenti Attivi', analytics.activeSubscriptions],
      ['Prenotazioni Oggi', analytics.todayBookings],
      ['Ricavi Mensili', `€${analytics.monthlyRevenue}`],
      ['Tasso Occupazione', `${analytics.occupancyRate.toFixed(1)}%`],
      ['Retention Rate', `${analytics.retentionRate}%`],
      ['Rating Medio', analytics.averageRating]
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Report esportato",
      description: "Il report analytics è stato scaricato con successo.",
    });
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Analytics Filters */}
      <AnalyticsFiltersComponent 
        filters={analyticsFilters}
        onFiltersChange={setAnalyticsFilters}
        onRefresh={refetch}
        onExport={handleExportAnalytics}
        loading={analyticsLoading}
      />

      {/* KPI Cards */}
      {analytics && (
        <KPICards data={analytics} loading={analyticsLoading} />
      )}

      {/* Charts */}
      {analytics && (
        <AnalyticsCharts data={analytics} />
      )}

      {/* Error State */}
      {analyticsError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <Activity className="h-4 w-4" />
              <span>Errore nel caricamento dei dati: {analyticsError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popular Courses and Recent Activity */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Corsi Più Popolari</CardTitle>
              <CardDescription>Maggiori prenotazioni questo periodo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.popularCourses.map((course, index) => (
                  <div key={course.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{course.name}</p>
                        <p className="text-xs text-muted-foreground">{course.instructor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {course.currentParticipants}/{course.maxParticipants}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {course.bookingCount} prenotazioni
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attività Recente</CardTitle>
              <CardDescription>Ultime azioni degli utenti</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <div>
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString()} alle{' '}
                          {new Date(activity.createdAt).toLocaleTimeString('it-IT', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={activity.status === 'confirmed' ? 'default' : 'secondary'}
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <img 
                    src={course.image} 
                    alt={course.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="font-medium">{course.name}</h4>
                    <p className="text-sm text-muted-foreground">{course.instructor}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">{course.category}</Badge>
                      <Badge variant="secondary">{course.level}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {course.currentParticipants}/{course.maxParticipants}
                    </p>
                    <p className="text-xs text-muted-foreground">€{course.price}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
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
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-medium">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-medium">{user.name}</h4>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge variant="default">{user.subscription}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Iscritto: {new Date(user.joinDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
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
          <h3 className="text-lg font-medium">Analytics Avanzate</h3>
          <p className="text-sm text-muted-foreground">
            Analisi dettagliate in tempo reale e report personalizzati
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch} disabled={analyticsLoading}>
            <Activity className="mr-2 h-4 w-4" />
            Aggiorna Dati
          </Button>
          <Button variant="outline" onClick={handleExportAnalytics}>
            <Download className="mr-2 h-4 w-4" />
            Esporta Report
          </Button>
        </div>
      </div>

      {/* Analytics Filters */}
      <AnalyticsFiltersComponent 
        filters={analyticsFilters}
        onFiltersChange={setAnalyticsFilters}
        onRefresh={refetch}
        onExport={handleExportAnalytics}
        loading={analyticsLoading}
      />

      {/* Advanced KPIs */}
      {analytics && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Tasso Occupazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {analytics.occupancyRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Media periodo</p>
                <div className="mt-2">
                  <div className="h-2 bg-muted rounded-full">
                    <div 
                      className="h-2 bg-gradient-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(analytics.occupancyRate, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Retention Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {analytics.retentionRate}%
                </div>
                <p className="text-xs text-muted-foreground">Ultimi 3 mesi</p>
                <Badge variant="default" className="mt-2">
                  Eccellente
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Crescita Utenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">+12%</div>
                <p className="text-xs text-muted-foreground">vs mese precedente</p>
                <p className="text-xs text-primary">+{Math.floor(analytics.totalUsers * 0.12)} nuovi utenti</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Revenue/Utente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  €{Math.floor(analytics.monthlyRevenue / Math.max(analytics.totalUsers, 1))}
                </div>
                <p className="text-xs text-muted-foreground">ARPU mensile</p>
                <Badge variant="secondary" className="mt-2">
                  +5% MoM
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Charts */}
          <AnalyticsCharts data={analytics} />
        </>
      )}

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Report Personalizzati</CardTitle>
          <CardDescription>
            Genera report dettagliati per diverse esigenze di business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Report Presenze Mensili', icon: Calendar, color: 'bg-blue-100 text-blue-800' },
              { name: 'Analisi Ricavi per Corso', icon: DollarSign, color: 'bg-green-100 text-green-800' },
              { name: 'Performance Istruttori', icon: Users, color: 'bg-purple-100 text-purple-800' },
              { name: 'Trend Abbonamenti', icon: TrendingUp, color: 'bg-orange-100 text-orange-800' },
              { name: 'Utilizzo Fasce Orarie', icon: Activity, color: 'bg-pink-100 text-pink-800' },
              { name: 'Customer Satisfaction', icon: Target, color: 'bg-indigo-100 text-indigo-800' }
            ].map((report, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${report.color}`}>
                    <report.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{report.name}</span>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {analyticsError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <Activity className="h-4 w-4" />
              <span>Errore nel caricamento dei dati analytics: {analyticsError}</span>
            </div>
          </CardContent>
        </Card>
      )}
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
            <Badge variant="default" className="bg-gradient-primary text-white">
              Admin
            </Badge>
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