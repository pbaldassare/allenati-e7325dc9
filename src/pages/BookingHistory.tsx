import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Clock, 
  User, 
  Star,
  X,
  Search,
  Loader2,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CancellationConfirmDialog } from '@/components/dialogs/CancellationConfirmDialog';
import { useBookings } from '@/hooks/useBookings';

const BookingHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { bookings, loading, cancelBooking: hookCancelBooking } = useBookings();

  if (!user) return null;
  
  const filteredBookings = bookings.filter(booking => {
    const course = booking.courses;
    const matchesSearch = !searchTerm || 
      (course?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       getInstructorName(course).toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') return matchesSearch;
    return booking.status === activeTab && matchesSearch;
  });

  const getInstructorName = (course: any): string => {
    // Gestisce entrambi i formati: course.instructors.profiles o course.instructor.profiles
    const profiles = course?.instructors?.profiles || course?.instructor?.profiles;
    if (!profiles) {
      return 'Istruttore non assegnato';
    }
    const { first_name, last_name } = profiles;
    return `${first_name || ''} ${last_name || ''}`.trim() || 'Istruttore non assegnato';
  };

  const getGymInfo = (course: any): string => {
    if (!course?.gyms) {
      return 'Palestra non specificata';
    }
    const { name, city } = course.gyms;
    return `${name}${city ? ` - ${city}` : ''}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success text-white';
      case 'waitlist':
        return 'bg-warning text-white';
      case 'cancelled':
        return 'bg-destructive text-white';
      case 'completed':
        return 'bg-primary text-white';
      default:
        return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermata';
      case 'waitlist':
        return 'Lista Attesa';
      case 'cancelled':
        return 'Cancellata';
      case 'completed':
        return 'Completata';
      default:
        return status;
    }
  };

  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const openCancellationDialog = (booking: any) => {
    setSelectedBooking(booking);
    setSelectedCourse(booking.courses);
    setCancellationDialogOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    const success = await hookCancelBooking(selectedBooking.id);
    if (success) {
      setCancellationDialogOpen(false);
    }
    setSelectedBooking(null);
    setSelectedCourse(null);
  };

  const BookingCard = ({ booking }: { booking: any }) => {
    const course = booking.courses;
    if (!course) return null;

    const canCancel = booking.status === 'confirmed' || booking.status === 'waitlist';
    const bookingDate = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
    const isUpcoming = bookingDate > new Date();

    return (
      <Card className="hover:shadow-card transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <img 
                src={course.image_url || '/placeholder.svg'} 
                alt={course.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
               <div className="space-y-2">
                 <div>
                   <h3 className="font-medium">{course.name}</h3>
                   <div className="space-y-1">
                     <p className="text-sm text-muted-foreground flex items-center">
                       <User className="mr-1 h-3 w-3" />
                       {getInstructorName(course)}
                     </p>
                     <p className="text-sm text-muted-foreground flex items-center">
                       <MapPin className="mr-1 h-3 w-3" />
                       {getGymInfo(course)}
                     </p>
                   </div>
                 </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-3 w-3" />
                    {new Date(booking.scheduled_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {booking.scheduled_time?.slice(0, 5)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(booking.status)}>
                    {getStatusText(booking.status)}
                  </Badge>
                  <Badge variant="outline">{course.course_categories?.name || 'Categoria non disponibile'}</Badge>
                </div>

                {booking.status === 'completed' && (
                  <div className="flex items-center text-sm text-success">
                    <Star className="mr-1 h-3 w-3 fill-current" />
                    Corso completato
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Crediti utilizzati</p>
                <p className="font-medium">{booking.credits_used}</p>
              </div>
              
              {canCancel && isUpcoming && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCancellationDialog(booking)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="mr-1 h-3 w-3" />
                  Cancella
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getTabCount = (status: string) => {
    if (status === 'all') return bookings.length;
    return bookings.filter(b => b.status === status).length;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Storico Prenotazioni
          </h1>
          <p className="text-muted-foreground">
            Visualizza e gestisci le tue prenotazioni
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Cerca per corso o istruttore..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{getTabCount('confirmed')}</div>
              <p className="text-xs text-muted-foreground">Confermate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">{getTabCount('waitlist')}</div>
              <p className="text-xs text-muted-foreground">In Attesa</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{getTabCount('completed')}</div>
              <p className="text-xs text-muted-foreground">Completate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{getTabCount('cancelled')}</div>
              <p className="text-xs text-muted-foreground">Cancellate</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              Tutte ({getTabCount('all')})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confermate
            </TabsTrigger>
            <TabsTrigger value="waitlist">
              In Attesa
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completate
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancellate
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm ? 'Nessuna prenotazione trovata' : 'Nessuna prenotazione'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? 'Prova a modificare il termine di ricerca'
                      : 'Inizia a prenotare i tuoi corsi preferiti'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredBookings
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
            )}
          </TabsContent>
        </Tabs>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Caricamento prenotazioni...</span>
          </div>
        )}

        <CancellationConfirmDialog
          open={cancellationDialogOpen}
          onOpenChange={setCancellationDialogOpen}
          course={selectedCourse || {}}
          booking={{
            scheduled_date: selectedBooking?.scheduled_date,
            scheduled_time: selectedBooking?.scheduled_time,
            credits_used: selectedBooking?.credits_used
          }}
          onConfirm={handleCancelBooking}
        />
      </div>
    </div>
  );
};

export default BookingHistory;