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
  Download
} from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';

const AdminDashboard = () => {
  console.log('AdminDashboard rendering...'); // Debug log
  const { getAnalytics, getAllUsers, courses, bookings } = useAppData();
  const [activeTab, setActiveTab] = useState('overview');
  const analytics = getAnalytics();
  const users = getAllUsers();

  console.log('AdminDashboard - Analytics:', analytics);
  console.log('AdminDashboard - Users:', users.length);
  console.log('AdminDashboard - Courses:', courses.length);

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
    <div className="p-6 space-y-6 bg-background min-h-full">
      {/* Enhanced Header with clear visibility indicators */}
      <div className="bg-gradient-primary p-6 rounded-xl text-white shadow-primary">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🎯 Dashboard Amministrativo
            </h1>
            <p className="text-white/90 text-lg">
              Gestisci la tua palestra e monitora le performance
            </p>
            <div className="mt-3 flex items-center space-x-4 text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full">
                ✅ Admin Panel Attivo
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full">
                📊 {analytics.totalUsers} Utenti
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full">
                💰 €{analytics.revenue.toLocaleString()} Revenue
              </span>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="bg-white text-primary text-lg px-4 py-2">
              ADMIN MODE
            </Badge>
            <p className="text-white/80 text-sm mt-2">
              {new Date().toLocaleDateString('it-IT')}
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Tab Navigation with better visibility */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-card/50 backdrop-blur-sm border border-border p-1">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white font-medium"
          >
            📊 Overview
          </TabsTrigger>
          <TabsTrigger 
            value="courses"
            className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white font-medium"
          >
            🏋️ Corsi
          </TabsTrigger>
          <TabsTrigger 
            value="users"
            className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white font-medium"
          >
            👥 Utenti
          </TabsTrigger>
          <TabsTrigger 
            value="messages"
            className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white font-medium"
          >
            💬 Messaggi
          </TabsTrigger>
          <TabsTrigger 
            value="analytics"
            className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white font-medium"
          >
            📈 Analytics
          </TabsTrigger>
        </TabsList>

        {/* Content sections with enhanced visibility */}
        <div className="bg-card/30 backdrop-blur-sm border border-border rounded-xl p-6 min-h-[600px]">
          <TabsContent value="overview" className="mt-0">
            <OverviewTab />
          </TabsContent>
          
          <TabsContent value="courses" className="mt-0">
            <CoursesTab />
          </TabsContent>
          
          <TabsContent value="users" className="mt-0">
            <UsersTab />
          </TabsContent>
          
          <TabsContent value="messages" className="mt-0">
            <MessagesTab />
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-0">
            <AnalyticsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;