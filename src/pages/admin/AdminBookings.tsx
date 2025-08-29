import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Search, Calendar, Users, CheckCircle, XCircle } from 'lucide-react';

interface Booking {
  id: string;
  user_id: string;
  course_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  credits_used: number;
  checked_in_at?: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
  courses?: {
    name: string;
  };
}

const AdminBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare le prenotazioni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'checked_in') {
        updateData.checked_in_at = new Date().toISOString();
      }

      // If cancelling, add cancellation timestamp
      if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancellation_reason = 'Cancellata dall\'amministratore';
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;

      // Process refund if cancelling (admins can always refund)
      if (newStatus === 'cancelled') {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          const { processRefund } = await import('@/lib/creditRefundHelpers');
          await processRefund(booking, '', 'admin', 'Cancellata dall\'amministratore');
        }
      }

      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus, checked_in_at: updateData.checked_in_at }
          : booking
      ));

      toast({
        title: "Successo",
        description: newStatus === 'cancelled' 
          ? "Prenotazione cancellata e crediti rimborsati"
          : "Status prenotazione aggiornato con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento della prenotazione",
        variant: "destructive",
      });
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesSearch = 
      `${booking.profiles?.first_name} ${booking.profiles?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.courses?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success';
      case 'checked_in': return 'bg-primary';
      case 'cancelled': return 'bg-destructive';
      case 'no_show': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confermata';
      case 'checked_in': return 'Check-in Fatto';
      case 'cancelled': return 'Cancellata';
      case 'no_show': return 'Assente';
      default: return status;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento prenotazioni...</div>
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
              Gestione Prenotazioni
            </h1>
            <p className="text-muted-foreground">
              Visualizza e gestisci tutte le prenotazioni
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Totali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Confermate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {bookings.filter(b => b.status === 'confirmed').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Check-in</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {bookings.filter(b => b.status === 'checked_in').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cancellate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {bookings.filter(b => b.status === 'cancelled').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Prenotazioni ({filteredBookings.length})
            </CardTitle>
            <CardDescription>
              Visualizza e gestisci tutte le prenotazioni
            </CardDescription>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca utente o corso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtra per status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="confirmed">Confermate</SelectItem>
                  <SelectItem value="checked_in">Check-in</SelectItem>
                  <SelectItem value="cancelled">Cancellate</SelectItem>
                  <SelectItem value="no_show">Assenti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Corso</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Crediti</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.profiles?.first_name} {booking.profiles?.last_name}
                    </TableCell>
                    <TableCell>{booking.courses?.name}</TableCell>
                    <TableCell>
                      {new Date(booking.scheduled_date).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell>{booking.scheduled_time}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{booking.credits_used}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {booking.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateBookingStatus(booking.id, 'checked_in')}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Check-in
                          </Button>
                        )}
                        
                        {booking.status !== 'cancelled' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-destructive"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBookings;