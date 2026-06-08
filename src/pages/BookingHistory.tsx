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
import { getInstructorName } from '@/types/course';
import { useIsMobile } from '@/hooks/use-mobile';

const BookingHistory = () => {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    document.title = "I Miei Corsi - FitBooking";
  }, []);

  const {
    bookings,
    loading: bookingsLoading,
    fetchBookings,
    cancelBooking
  } = useBookings(selectedGym?.id);

  // Debug logging
  useEffect(() => {
    console.log('BookingHistory - Debugging info:');
    console.log('User:', user?.id);
    console.log('Selected gym:', selectedGym?.id, selectedGym?.name);
    console.log('Bookings:', bookings?.length);
    console.log('Bookings loading:', bookingsLoading);
    console.log('Full bookings data:', bookings);
  }, [user, selectedGym, bookings, bookingsLoading]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSection, setActiveSection] = useState<'active' | 'history'>('active');


  // Helper functions

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


  // Helpers: usa snapshot quando la relazione courses è nascosta da RLS
  const getCourseName = (booking: any): string =>
    booking.courses?.name || booking.course?.name || booking.course_name_snapshot || 'Corso';
  const getInstructorDisplay = (booking: any): string => {
    const course = booking.courses || booking.course;
    const fromRelation = course ? getInstructorName(course) : null;
    if (fromRelation && fromRelation !== 'Istruttore non assegnato') return fromRelation;
    return booking.instructor_name_snapshot || 'Istruttore non assegnato';
  };

  // Filter bookings
  const activeBookings = bookings?.filter(booking => {
    const isActive = ['confirmed', 'waitlist'].includes(booking.status);
    const today = new Date();
    const bookingDate = new Date(booking.scheduled_date);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const courseDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const isTodayOrFuture = courseDateOnly >= todayDate;
    const shouldBeActive = isActive && isTodayOrFuture;
    
    if (!searchTerm) return shouldBeActive;
    
    const s = searchTerm.toLowerCase();
    return shouldBeActive && (
      getCourseName(booking).toLowerCase().includes(s) ||
      getInstructorDisplay(booking).toLowerCase().includes(s)
    );
  }) || [];

  const completedBookings = bookings?.filter(booking => {
    const isCompleted = ['completed', 'cancelled'].includes(booking.status);
    const today = new Date();
    const bookingDate = new Date(booking.scheduled_date);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const courseDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const isPast = courseDateOnly < todayDate;
    const shouldBeInHistory = isCompleted || ((['confirmed', 'waitlist'].includes(booking.status)) && isPast);
    
    if (!searchTerm) return shouldBeInHistory;
    
    const s = searchTerm.toLowerCase();
    return shouldBeInHistory && (
      getCourseName(booking).toLowerCase().includes(s) ||
      getInstructorDisplay(booking).toLowerCase().includes(s)
    );
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
    const courseName = getCourseName(booking);
    const instructorLabel = getInstructorDisplay(booking);
    const gymLabel = course
      ? getGymInfo(course)
      : (booking.gym_name_snapshot || 'Palestra non specificata');
    const roomLabel = booking.room_name_snapshot;
    const categoryLabel = course?.course_categories?.name;

    const canCancel = booking.status === 'confirmed' || booking.status === 'waitlist';
    const bookingDate = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
    const isUpcoming = bookingDate > new Date();

    return (
      <Card className="hover:shadow-card transition-all duration-300">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-start space-x-3 md:space-x-4 flex-1">
              <img 
                src={course?.image_url || '/placeholder.svg'} 
                alt={courseName}
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover flex-shrink-0 bg-muted"
              />
              
              <div className="space-y-2 md:space-y-3 flex-1 min-w-0">
                <div>
                  <h3 className="font-medium text-sm md:text-base leading-tight">{courseName}</h3>
                  
                  <div className="space-y-1 mt-1">
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center">
                      <User className="mr-1 h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{instructorLabel}</span>
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground flex items-center">
                      <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {gymLabel}{roomLabel ? ` · ${roomLabel}` : ''}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 md:space-x-4 text-xs md:text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">{new Date(booking.scheduled_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">{booking.scheduled_time?.slice(0, 5)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <Badge className={`${getStatusColor(booking.status)} text-xs`}>
                    {getStatusText(booking.status)}
                  </Badge>
                  {categoryLabel && (
                    <Badge variant="outline" className="text-xs">
                      {categoryLabel}
                    </Badge>
                  )}
                </div>

                {booking.status === 'completed' && (
                  <div className="flex items-center text-xs md:text-sm text-success">
                    <Star className="mr-1 h-3 w-3 fill-current flex-shrink-0" />
                    <span>Corso completato</span>
                  </div>
                )}
              </div>
            </div>


            {/* Credits and action area */}
            <div className="flex items-center justify-between md:flex-col md:items-end md:space-y-2 md:ml-4">
              {/* Credits info */}
              <div className="text-left md:text-right">
                <p className="text-xs text-muted-foreground">Crediti utilizzati</p>
                <p className="font-medium text-sm md:text-base">{booking.credits_used}</p>
              </div>
              
              {/* Cancel button */}
              {canCancel && isUpcoming && (
                <Button
                  variant="destructive"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => openCancellationDialog(booking)}
                  className={`ml-4 md:ml-0 flex-shrink-0 transition-all duration-200 ${
                    isMobile 
                      ? 'min-h-[44px] px-4 text-sm font-medium shadow-sm' 
                      : 'hover:shadow-md'
                  }`}
                >
                  <X className={`${isMobile ? 'mr-2 h-4 w-4' : 'mr-1 h-3 w-3'}`} />
                  <span>Cancella</span>
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
          if (tab === 'i-miei-corsi') return;
          // Route esterne: stessa logica di Index.tsx
          const externalRoutes: Record<string, string> = {
            gyms: '/gyms',
            shop: '/shop',
            admin: '/admin',
            owner: '/owner',
            instructor: '/instructor',
          };
          if (externalRoutes[tab]) {
            navigate(externalRoutes[tab]);
            return;
          }
          // Tab interne dell'Index (home, chat, profile, ...)
          navigate(`/?tab=${tab}`);
        }} 
      />
    </div>
  );
};

export default BookingHistory;