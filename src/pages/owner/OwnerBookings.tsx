import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, CheckCircle, XCircle, Clock, Trash2, Calendar, Users, TrendingUp, Eye } from "lucide-react";
import { useOwnerBookings, type OwnerBooking } from "@/hooks/useOwnerBookings";
import { useIsMobile } from "@/hooks/use-mobile";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const OwnerBookings: React.FC = () => {
  const { bookings, loading, cancelOwnerBooking } = useOwnerBookings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('thisWeek');
  const [cancellationReason, setCancellationReason] = useState('');
  const [showFullDetails, setShowFullDetails] = useState(false);
  const isMobile = useIsMobile();

  // Helper functions for date filtering
  const getStartOfWeek = (date = new Date()) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getEndOfWeek = (date = new Date()) => {
    const end = new Date(getStartOfWeek(date));
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const getStartOfNextWeek = () => {
    const start = new Date(getStartOfWeek());
    start.setDate(start.getDate() + 7);
    return start;
  };

  const getEndOfNextWeek = () => {
    const end = new Date(getEndOfWeek());
    end.setDate(end.getDate() + 7);
    return end;
  };

  const getStartOfMonth = (date = new Date()) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getEndOfMonth = (date = new Date()) => {
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.course?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${booking.user?.first_name || ''} ${booking.user?.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      filtered = filtered.filter(booking => {
        const scheduledDate = new Date(booking.scheduled_date);
        
        switch (dateFilter) {
          case 'thisWeek':
            return scheduledDate >= getStartOfWeek() && scheduledDate <= getEndOfWeek();
          case 'nextWeek':
            return scheduledDate >= getStartOfNextWeek() && scheduledDate <= getEndOfNextWeek();
          case 'thisMonth':
            return scheduledDate >= getStartOfMonth() && scheduledDate <= getEndOfMonth();
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  const handleCancelBooking = async (bookingId: string) => {
    await cancelOwnerBooking(bookingId, cancellationReason || undefined);
    setCancellationReason('');
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      confirmed: { variant: 'default', icon: CheckCircle, label: 'Confermata' },
      cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancellata' },
      completed: { variant: 'secondary', icon: CheckCircle, label: 'Completata' },
      waitlist: { variant: 'outline', icon: Clock, label: 'Lista d\'attesa' },
      no_show: { variant: 'outline', icon: XCircle, label: 'Non presentato' }
    };
    
    const config = variants[status] || { variant: 'outline', icon: Clock, label: status };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = {
    total: filteredBookings.length,
    confirmed: filteredBookings.filter(b => b.status === 'confirmed').length,
    completed: filteredBookings.filter(b => b.status === 'completed').length,
    cancelled: filteredBookings.filter(b => b.status === 'cancelled').length,
  };

  // Mobile-specific data calculations
  const pieData = [
    { name: 'Confermate', value: stats.confirmed, color: 'hsl(var(--primary))' },
    { name: 'Completate', value: stats.completed, color: 'hsl(var(--secondary))' },
    { name: 'Cancellate', value: stats.cancelled, color: 'hsl(var(--destructive))' },
  ].filter(item => item.value > 0);

  const courseStats = useMemo(() => {
    const courseCounts = filteredBookings.reduce((acc, booking) => {
      const courseName = booking.course?.name || 'Corso sconosciuto';
      acc[courseName] = (acc[courseName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(courseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredBookings]);

  const todayBookings = filteredBookings.filter(booking => {
    const today = new Date().toDateString();
    const bookingDate = new Date(booking.scheduled_date).toDateString();
    return today === bookingDate;
  });

  if (loading) {
    return <div className="text-center py-8">Caricamento prenotazioni...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Gestione Prenotazioni
        </h1>
        <p className="text-muted-foreground">
          Monitora e gestisci tutte le prenotazioni dei corsi
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confermate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancellate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile filters - simplified */}
      {isMobile ? (
        <div className="flex flex-col space-y-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="thisWeek">Questa settimana</SelectItem>
              <SelectItem value="nextWeek">Settimana prossima</SelectItem>
              <SelectItem value="thisMonth">Questo mese</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="confirmed">Confermate</SelectItem>
              <SelectItem value="completed">Completate</SelectItem>
              <SelectItem value="cancelled">Cancellate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        /* Desktop filters */
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca corso, utente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="thisWeek">Questa settimana</SelectItem>
              <SelectItem value="nextWeek">Settimana prossima</SelectItem>
              <SelectItem value="thisMonth">Questo mese</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="confirmed">Confermate</SelectItem>
              <SelectItem value="completed">Completate</SelectItem>
              <SelectItem value="cancelled">Cancellate</SelectItem>
              <SelectItem value="waitlist">Lista d'attesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Mobile optimized view */}
      {isMobile && !showFullDetails ? (
        <div className="space-y-4">
          {/* Today's highlights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Oggi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{todayBookings.length}</div>
              <p className="text-sm text-muted-foreground">prenotazioni</p>
            </CardContent>
          </Card>

          {/* Distribution chart */}
          {pieData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Distribuzione Stati</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
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
                <div className="flex flex-wrap gap-2 mt-4">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1">
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
          )}

          {/* Top courses */}
          {courseStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Corsi Più Richiesti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={courseStats}>
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
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Azioni Rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowFullDetails(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Vedi Lista Completa
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Desktop view or mobile detailed view */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Prenotazioni ({filteredBookings.length})</CardTitle>
            {isMobile && showFullDetails && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFullDetails(false)}
              >
                Vista Compatta
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {filteredBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' ? 'Nessuna prenotazione trovata' : 'Nessuna prenotazione presente'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Corso</TableHead>
                    <TableHead>Sala</TableHead>
                    <TableHead>Data/Ora</TableHead>
                    <TableHead>Crediti</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Prenotato</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={booking.user?.profile_picture_url} />
                            <AvatarFallback>
                              {booking.user?.first_name?.[0]}{booking.user?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {booking.user?.first_name} {booking.user?.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {booking.user?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{booking.course?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{booking.room_name || 'Non specificata'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{new Date(booking.scheduled_date).toLocaleDateString('it-IT')}</div>
                          <div className="text-sm text-muted-foreground">{booking.scheduled_time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{booking.credits_used}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.status)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(booking.created_at).toLocaleDateString('it-IT')}
                      </TableCell>
                      <TableCell>
                        {(booking.status === 'confirmed' || booking.status === 'waitlist') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancella Prenotazione</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sei sicuro di voler cancellare la prenotazione di {booking.user?.first_name} {booking.user?.last_name} per il corso "{booking.course?.name}"?
                                  <br />
                                  I crediti verranno automaticamente rimborsati.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="py-4">
                                <label className="text-sm font-medium mb-2 block">
                                  Motivo della cancellazione (opzionale)
                                </label>
                                <Textarea
                                  placeholder="Inserisci il motivo della cancellazione..."
                                  value={cancellationReason}
                                  onChange={(e) => setCancellationReason(e.target.value)}
                                  className="min-h-[80px]"
                                />
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setCancellationReason('')}>
                                  Annulla
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancella Prenotazione
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OwnerBookings;