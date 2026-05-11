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
import { Search, CheckCircle, XCircle, Clock, Trash2, Calendar, Users, TrendingUp, Eye, X } from "lucide-react";
import { useOwnerBookings, type OwnerBooking } from "@/hooks/useOwnerBookings";
import { useIsMobile } from "@/hooks/use-mobile";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useOwnerGym } from '@/contexts/OwnerGymContext';

const OwnerBookings: React.FC = () => {
  const { selectedGym } = useOwnerGym();
  const { bookings, loading, cancelOwnerBooking } = useOwnerBookings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('confirmed');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
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

    if (statusFilter === 'not_cancelled') {
      filtered = filtered.filter(booking => booking.status !== 'cancelled');
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      filtered = filtered.filter(booking => {
        const scheduledDate = new Date(booking.scheduled_date);
        
        switch (dateFilter) {
          case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            return scheduledDate >= today && scheduledDate <= todayEnd;
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

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(b => new Date(b.scheduled_date) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(b => new Date(b.scheduled_date) <= to);
    }

    return filtered;
  }, [bookings, searchTerm, statusFilter, dateFilter, dateFrom, dateTo]);

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
    waitlist: filteredBookings.filter(b => b.status === 'waitlist').length,
  };

  // Calculate if there are hidden bookings due to filters
  const totalBookingsWithOtherStatus = useMemo(() => {
    if (statusFilter === 'all') return 0;
    return bookings.filter(b => b.status !== statusFilter).length;
  }, [bookings, statusFilter]);

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

      {/* Mobile Search and Controls - Top */}
      {isMobile && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca corso, utente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFullDetails ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="whitespace-nowrap"
            >
              {showFullDetails ? "Compatta" : "Lista"}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="today">Oggi</SelectItem>
                <SelectItem value="thisWeek">Questa settimana</SelectItem>
                <SelectItem value="nextWeek">Settimana prossima</SelectItem>
                <SelectItem value="thisMonth">Questo mese</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="not_cancelled">Non cancellate</SelectItem>
                <SelectItem value="confirmed">Confermate</SelectItem>
                <SelectItem value="waitlist">Lista d'attesa</SelectItem>
                <SelectItem value="completed">Completate</SelectItem>
                <SelectItem value="cancelled">Cancellate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Dal</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Al</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="icon" className="mt-4" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">In attesa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.waitlist}</div>
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

      {/* Desktop filters */}
      {!isMobile && (
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
              <SelectItem value="today">Oggi</SelectItem>
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
              <SelectItem value="not_cancelled">Non cancellate</SelectItem>
              <SelectItem value="confirmed">Confermate</SelectItem>
              <SelectItem value="waitlist">Lista d'attesa</SelectItem>
              <SelectItem value="completed">Completate</SelectItem>
              <SelectItem value="cancelled">Cancellate</SelectItem>
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
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' ? 'Nessuna prenotazione trovata' : 'Nessuna prenotazione presente'}
                </p>
                {filteredBookings.length === 0 && totalBookingsWithOtherStatus > 0 && (
                  <p className="text-sm text-muted-foreground">
                    💡 Ci sono {totalBookingsWithOtherStatus} prenotazioni con altri stati.{' '}
                    <button 
                      onClick={() => setStatusFilter('all')} 
                      className="text-primary underline hover:no-underline"
                    >
                      Mostra tutte
                    </button>
                  </p>
                )}
              </div>
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
                    <TableHead>Cancellata il</TableHead>
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
                          <div className="text-sm text-muted-foreground">{booking.scheduled_time.slice(0, 5)}</div>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {booking.status === 'cancelled' && booking.cancelled_at ? (
                          <div>
                            <div>{new Date(booking.cancelled_at).toLocaleDateString('it-IT')}</div>
                            <div className="text-xs">
                              {new Date(booking.cancelled_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {booking.cancellation_reason && (
                              <div className="text-xs italic mt-1 max-w-[200px] truncate" title={booking.cancellation_reason}>
                                {booking.cancellation_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
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