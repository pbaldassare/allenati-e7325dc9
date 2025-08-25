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
import { Search, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { useOwnerBookings, type OwnerBooking } from "@/hooks/useOwnerBookings";

const OwnerBookings: React.FC = () => {
  const { bookings, loading, cancelOwnerBooking } = useOwnerBookings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancellationReason, setCancellationReason] = useState('');

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

    return filtered;
  }, [bookings, searchTerm, statusFilter]);

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
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Prenotazioni ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm || statusFilter !== 'all' ? 'Nessuna prenotazione trovata' : 'Nessuna prenotazione presente'}
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
    </div>
  );
};

export default OwnerBookings;