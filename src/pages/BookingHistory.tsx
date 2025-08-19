import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  User, 
  Star,
  X,
  Search,
  Loader2,
  MapPin,
  Users,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CancellationConfirmDialog } from '@/components/dialogs/CancellationConfirmDialog';
import { BookingConfirmDialog } from '@/components/dialogs/BookingConfirmDialog';
import { useBookings } from '@/hooks/useBookings';
import { supabase } from '@/integrations/supabase/client';
import { useGym } from '@/contexts/GymContext';
import { BottomNavigation } from '@/components/BottomNavigation';

const BookingHistory = () => {
  const { user } = useAuth();
  const { userGyms } = useGym();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "I Miei Corsi - FitBooking";
  }, []);

  const {
    bookings,
    loading: bookingsLoading,
    fetchBookings,
    cancelBooking
  } = useBookings();

  // Debug logging
  useEffect(() => {
    console.log('BookingHistory - Debugging info:');
    console.log('User:', user?.id);
    console.log('User gyms:', userGyms?.length);
    console.log('Bookings:', bookings?.length);
    console.log('Bookings loading:', bookingsLoading);
    console.log('Full bookings data:', bookings);
  }, [user, userGyms, bookings, bookingsLoading]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<'active' | 'history'>('active');


  // Helper functions
  const getInstructorName = (course: any): string => {
    const profiles = course?.instructors?.profiles || course?.instructor?.profiles;
    if (!profiles) {
      return 'Istruttore non assegnato';
    }
    const { first_name, last_name } = profiles;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();
    return fullName || 'Istruttore non assegnato';
  };

  const getGymInfo = (course: any): string => {
    if (!course?.gyms && !course?.gym) {
      return 'Palestra non specificata';
    }
    const gymData = course.gyms || course.gym;
    const { name, city } = gymData;
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

  // Filter bookings
  const activeBookings = bookings?.filter(booking => {
    const isActive = ['confirmed', 'waitlist'].includes(booking.status);
    if (!searchTerm) return isActive;
    
    const searchTermLower = searchTerm.toLowerCase();
    const course = booking.courses || booking.course;
    const courseNameMatch = course?.name?.toLowerCase().includes(searchTermLower);
    const instructorMatch = getInstructorName(course)?.toLowerCase().includes(searchTermLower);
    
    return isActive && (courseNameMatch || instructorMatch);
  }) || [];

  const completedBookings = bookings?.filter(booking => {
    const isCompleted = ['completed', 'cancelled'].includes(booking.status);
    if (!searchTerm) return isCompleted;
    
    const searchTermLower = searchTerm.toLowerCase();
    const course = booking.courses || booking.course;
    const courseNameMatch = course?.name?.toLowerCase().includes(searchTermLower);
    const instructorMatch = getInstructorName(course)?.toLowerCase().includes(searchTermLower);
    
    return isCompleted && (courseNameMatch || instructorMatch);
  }) || [];

  const openCancellationDialog = (booking: any) => {
    setSelectedBooking(booking);
    setShowCancellationDialog(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    setIsProcessing(true);
    const success = await cancelBooking(selectedBooking.id);
    if (success) {
      setShowCancellationDialog(false);
    }
    setSelectedBooking(null);
    setIsProcessing(false);
  };


  const BookingCard = ({ booking }: { booking: any }) => {
    const course = booking.courses || booking.course;
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

  const handleBack = () => {
    navigate('/', { replace: true });
  };


  if (!user) {
    console.log('BookingHistory - No user, redirecting or showing login');
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Devi effettuare l'accesso per vedere i tuoi corsi.</p>
            <Button onClick={() => navigate('/auth')} className="mt-4">
              Accedi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              I Miei Corsi
            </h1>
            <p className="text-muted-foreground">
              I tuoi corsi prenotati e storico delle prenotazioni
            </p>
          </div>
        </header>

        {/* Search and Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={activeSection === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('active')}
            >
              Corsi Prenotati
            </Button>
            <Button
              variant={activeSection === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('history')}
            >
              Storico
            </Button>
          </div>
          <Input
            placeholder="Cerca corsi o istruttori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Active Section - Corsi Prenotati */}
        {activeSection === 'active' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-primary">Corsi Prenotati</h2>
            {bookingsLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeBookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Non hai corsi prenotati al momento.</p>
                  <p className="text-sm mt-2">Vai alla home per prenotare un corso!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeBookings
                  .sort((a, b) => new Date(`${a.scheduled_date}T${a.scheduled_time}`).getTime() - new Date(`${b.scheduled_date}T${b.scheduled_time}`).getTime())
                  .map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* History Section - Storico */}
        {activeSection === 'history' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-primary">Storico</h2>
            {bookingsLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : completedBookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>Nessun corso nello storico.</p>
                  <p className="text-sm mt-2">I corsi completati o cancellati appariranno qui.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedBookings
                  .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
                  .map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
              </div>
            )}
          </div>
        )}

        <CancellationConfirmDialog
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          course={selectedBooking?.courses || selectedBooking?.course || {}}
          booking={selectedBooking || {}}
          onConfirm={handleCancelBooking}
          isLoading={isProcessing}
        />
      </div>
      
      <BottomNavigation 
        activeTab="i-miei-corsi" 
        onTabChange={(tab) => {
          if (tab !== 'i-miei-corsi') {
            navigate(`/?tab=${tab}`, { replace: true });
          }
        }} 
      />
    </div>
  );
};

export default BookingHistory;