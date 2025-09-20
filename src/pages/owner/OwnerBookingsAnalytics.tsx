import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, Users, TrendingUp, BarChart3, Eye, Filter, Download } from "lucide-react";
import { useBookingsAnalytics, type BookingAnalytic, type UserBookingAnalytic, type AnalyticsFilters } from "@/hooks/useBookingsAnalytics";
import { useIsMobile } from "@/hooks/use-mobile";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";
import { UserHistoryModal } from "@/components/UserHistoryModal";
import { useOwnerGym } from '@/contexts/OwnerGymContext';

const OwnerBookingsAnalytics: React.FC = () => {
  const { selectedGym } = useOwnerGym();
  const { bookings, userStats, loading, fetchBookingsAnalytics } = useBookingsAnalytics();
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const isMobile = useIsMobile();

  // Apply filters and search
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${booking.user_first_name || ''} ${booking.user_last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [bookings, searchTerm]);

  const filteredUserStats = useMemo(() => {
    let filtered = userStats;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        `${user.user_first_name || ''} ${user.user_last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [userStats, searchTerm]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const total = filteredBookings.length;
    const confirmed = filteredBookings.filter(b => b.status === 'confirmed').length;
    const completed = filteredBookings.filter(b => b.status === 'completed').length;
    const cancelled = filteredBookings.filter(b => b.status === 'cancelled').length;
    const noShow = filteredBookings.filter(b => b.status === 'no_show').length;
    const totalCredits = filteredBookings.reduce((sum, b) => sum + b.credits_used, 0);

    // Monthly trends
    const monthlyData = new Map<string, { month: string; bookings: number; credits: number }>();
    filteredBookings.forEach(booking => {
      const monthKey = `${booking.booking_year}-${booking.booking_month.toString().padStart(2, '0')}`;
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { month: monthKey, bookings: 0, credits: 0 });
      }
      const data = monthlyData.get(monthKey)!;
      data.bookings++;
      data.credits += booking.credits_used;
    });

    // Course popularity
    const courseData = new Map<string, number>();
    filteredBookings.forEach(booking => {
      courseData.set(booking.course_name, (courseData.get(booking.course_name) || 0) + 1);
    });

    const topCourses = Array.from(courseData.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total,
      confirmed,
      completed,
      cancelled,
      noShow,
      totalCredits,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
      cancellationRate: total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0',
      monthlyTrends: Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month)),
      topCourses
    };
  }, [filteredBookings]);

  const pieData = [
    { name: 'Confermate', value: analytics.confirmed, color: 'hsl(var(--primary))' },
    { name: 'Completate', value: analytics.completed, color: 'hsl(var(--success))' },
    { name: 'Cancellate', value: analytics.cancelled, color: 'hsl(var(--destructive))' },
    { name: 'Non presentati', value: analytics.noShow, color: 'hsl(var(--muted))' },
  ].filter(item => item.value > 0);

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      confirmed: { variant: 'default', label: 'Confermata' },
      cancelled: { variant: 'destructive', label: 'Cancellata' },
      completed: { variant: 'secondary', label: 'Completata' },
      waitlist: { variant: 'outline', label: 'Lista d\'attesa' },
      no_show: { variant: 'outline', label: 'Non presentato' }
    };
    
    const config = variants[status] || { variant: 'outline', label: status };
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleUserClick = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setHistoryModalOpen(true);
  };

  const applyFilters = (newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
    fetchBookingsAnalytics(newFilters);
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Analytics Prenotazioni
        </h1>
        <p className="text-muted-foreground">
          Dashboard consolidata per l'analisi delle prenotazioni e comportamenti utenti
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale Prenotazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total}</div>
            <p className="text-xs text-muted-foreground">Dati consolidati</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasso Completamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.completionRate}%</div>
            <p className="text-xs text-muted-foreground">{analytics.completed} completate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasso Cancellazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.cancellationRate}%</div>
            <p className="text-xs text-muted-foreground">{analytics.cancelled} cancellate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Crediti Utilizzati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.totalCredits}</div>
            <p className="text-xs text-muted-foreground">Totale crediti</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Utenti Attivi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{userStats.length}</div>
            <p className="text-xs text-muted-foreground">Utenti unici</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca utente, corso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filtri Avanzati
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Esporta
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="trends">Tendenze</TabsTrigger>
          <TabsTrigger value="users">Utenti</TabsTrigger>
          <TabsTrigger value="bookings">Prenotazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione Stati</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">Nessun dato disponibile</p>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Courses */}
            <Card>
              <CardHeader>
                <CardTitle>Corsi Più Richiesti</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topCourses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.topCourses}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">Nessun dato disponibile</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendenze Mensili</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.monthlyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Prenotazioni"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="credits" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      name="Crediti"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Nessun dato disponibile</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistiche Utenti ({filteredUserStats.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredUserStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessun utente trovato
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead>Prenotazioni</TableHead>
                      <TableHead>Completate</TableHead>
                      <TableHead>Crediti Usati</TableHead>
                      <TableHead>Corsi Diversi</TableHead>
                      <TableHead>Primo/Ultimo</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUserStats.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {user.user_first_name?.[0]}{user.user_last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.user_first_name} {user.user_last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.user_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium">{user.total_bookings}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.cancelled_bookings > 0 && `${user.cancelled_bookings} cancellate`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium text-green-600">{user.completed_bookings}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.total_bookings > 0 ? 
                                `${((user.completed_bookings / user.total_bookings) * 100).toFixed(0)}%` : 
                                '0%'
                              }
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {user.total_credits_used}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.unique_courses_booked}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>Primo: {new Date(user.first_booking_date).toLocaleDateString('it-IT')}</div>
                            <div>Ultimo: {new Date(user.last_booking_date).toLocaleDateString('it-IT')}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUserClick(
                              user.user_id, 
                              `${user.user_first_name} ${user.user_last_name}`
                            )}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prenotazioni Dettagliate ({filteredBookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredBookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna prenotazione trovata
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead>Corso</TableHead>
                      <TableHead>Data/Ora</TableHead>
                      <TableHead>Sala</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Consolidato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.slice(0, 100).map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {booking.user_first_name} {booking.user_last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {booking.user_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.course_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.instructor_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{new Date(booking.scheduled_date).toLocaleDateString('it-IT')}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.scheduled_time.slice(0, 5)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{booking.room_name}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(booking.status)}
                        </TableCell>
                        <TableCell>
                          {booking.is_consolidated ? (
                            <Badge variant="secondary">✓ Consolidato</Badge>
                          ) : (
                            <Badge variant="outline">Live</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User History Modal */}
      {selectedUserId && (
        <UserHistoryModal
          userId={selectedUserId}
          userName={filteredUserStats.find(u => u.user_id === selectedUserId)?.user_first_name + ' ' + filteredUserStats.find(u => u.user_id === selectedUserId)?.user_last_name || 'Utente'}
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false);
            setSelectedUserId(null);
          }}
          gymId={selectedGym?.id}
        />
      )}
    </div>
  );
};

export default OwnerBookingsAnalytics;