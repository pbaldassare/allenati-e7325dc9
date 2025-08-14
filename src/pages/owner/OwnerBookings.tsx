import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Calendar, Users, CheckCircle, XCircle, Clock, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BookingItem {
  id: string;
  user_id: string;
  course_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  created_at: string;
  credits_used: number;
  checked_in_at?: string;
  cancelled_at?: string;
  course: {
    name: string;
  };
  user: {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
  };
  room_name?: string;
}

const OwnerBookings: React.FC = () => {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Prenotazioni | Area Proprietario";
    loadBookings();
  }, []);

  useEffect(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${booking.user.first_name} ${booking.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter]);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: gymId } = await supabase.rpc('get_user_gym_id', { _user_id: user.id });
      if (!gymId) return;

      const { data: gymCourses } = await supabase
        .from('courses')
        .select('id')
        .eq('gym_id', gymId);

      if (!gymCourses || gymCourses.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select(`
          *,
          courses!inner(name),
          profiles!inner(first_name, last_name, email, profile_picture_url)
        `)
        .in('course_id', gymCourses.map(c => c.id))
        .order("scheduled_date", { ascending: false });

      if (error) throw error;

      const formattedBookings = (bookingsData || []).map((booking: any) => ({
        ...booking,
        course: booking.courses,
        user: booking.profiles,
        room_name: 'Sala 1'
      }));

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      confirmed: { variant: 'default', icon: CheckCircle, label: 'Confermata' },
      cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancellata' },
      completed: { variant: 'secondary', icon: CheckCircle, label: 'Completata' },
      pending: { variant: 'outline', icon: Clock, label: 'In attesa' }
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={booking.user.profile_picture_url} />
                          <AvatarFallback>
                            {booking.user.first_name?.[0]}{booking.user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {booking.user.first_name} {booking.user.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {booking.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{booking.course.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{booking.room_name || 'Sala 1'}</Badge>
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