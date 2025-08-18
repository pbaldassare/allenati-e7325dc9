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
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CancellationConfirmDialog } from '@/components/dialogs/CancellationConfirmDialog';
import { BookingConfirmDialog } from '@/components/dialogs/BookingConfirmDialog';
import { useBookings } from '@/hooks/useBookings';
import { supabase } from '@/integrations/supabase/client';
import { useGym } from '@/contexts/GymContext';

const BookingHistory = () => {
  const { user } = useAuth();
  const { userGyms } = useGym();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "I Miei Corsi - FitBooking";
  }, []);

  const {
    bookings,
    loading: bookingsLoading,
    fetchBookings,
    cancelBooking
  } = useBookings();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);

  // Fetch available courses
  useEffect(() => {
    const fetchAvailableCourses = async () => {
      if (!user || userGyms.length === 0) return;
      
      setCoursesLoading(true);
      try {
        const userGymIds = userGyms.map(gym => gym.id);
        
        const { data: courses, error } = await supabase
          .from('courses')
          .select(`
            *,
            instructor:instructors(
              id,
              user_id,
              bio,
              profiles:user_id(first_name, last_name, avatar_url)
            ),
            category:course_categories(name, color_hex),
            schedules:course_schedules(
              day_of_week,
              start_time,
              end_time,
              room_name
            ),
            gym:gyms(name, city)
          `)
          .in('gym_id', userGymIds)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        
        // Filter out courses user has already booked
        const userBookedCourseIds = bookings
          .filter(b => ['confirmed', 'waitlist'].includes(b.status))
          .map(b => b.course_id);
          
        const filteredCourses = (courses || []).filter(course => 
          !userBookedCourseIds.includes(course.id)
        );
        
        setAvailableCourses(filteredCourses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchAvailableCourses();
  }, [user, userGyms, bookings]);

  // Helper functions
  const getInstructorName = (course: any): string => {
    const profiles = course?.instructors?.profiles || course?.instructor?.profiles;
    if (!profiles) {
      return 'Istruttore non assegnato';
    }
    const { first_name, last_name } = profiles;
    return `${first_name || ''} ${last_name || ''}`.trim() || 'Istruttore non assegnato';
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
  const activeBookings = bookings?.filter(booking => 
    ['confirmed', 'waitlist'].includes(booking.status)
  ) || [];

  const completedBookings = bookings?.filter(booking => 
    ['completed', 'cancelled'].includes(booking.status)
  ) || [];

  const filteredBookings = bookings?.filter(booking => {
    const searchTermLower = searchTerm.toLowerCase();
    const courseNameMatch = booking.course?.name?.toLowerCase().includes(searchTermLower);
    const instructorMatch = getInstructorName(booking.course)?.toLowerCase().includes(searchTermLower);
    
    return !searchTerm || courseNameMatch || instructorMatch;
  }) || [];

  const openCancellationDialog = (booking: any) => {
    setSelectedBooking(booking);
    setSelectedCourse(booking.course);
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
    setSelectedCourse(null);
    setIsProcessing(false);
  };

  const openBookingDialog = (course: any) => {
    setSelectedCourse(course);
    setBookingDialogOpen(true);
  };

  const handleBookingConfirm = async () => {
    // This will be handled by the BookingConfirmDialog component
    setBookingDialogOpen(false);
    setSelectedCourse(null);
    // Refresh data
    await fetchBookings();
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            I Miei Corsi
          </h1>
          <p className="text-muted-foreground">
            I tuoi corsi prenotati e altri disponibili
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Input
            placeholder="Cerca corsi o istruttori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* I Miei Corsi Attivi */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-primary">I Miei Corsi Attivi</h2>
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
                Non hai corsi attivi. Prenota un corso qui sotto!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeBookings
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
            </div>
          )}
        </div>

        {/* Corsi Disponibili */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-primary">Corsi Disponibili</h2>
          {coursesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {availableCourses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {course.instructor?.profiles?.avatar_url && (
                          <img 
                            src={course.instructor.profiles.avatar_url} 
                            alt="Istruttore"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{course.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {course.gym?.name} - {course.gym?.city}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="px-3"
                        onClick={() => openBookingDialog(course)}
                      >
                        P
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Storico */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-primary">Storico Lezioni</h2>
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
                Nessuna lezione completata o cancellata.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedBookings
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
            </div>
          )}
        </div>

        <CancellationConfirmDialog
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          course={selectedCourse || {}}
          booking={{
            scheduled_date: selectedBooking?.scheduled_date,
            scheduled_time: selectedBooking?.scheduled_time,
            credits_used: selectedBooking?.credits_used
          }}
          onConfirm={handleCancelBooking}
          isLoading={isProcessing}
        />

        <BookingConfirmDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          course={selectedCourse}
          scheduledDate={new Date().toISOString().split('T')[0]}
          scheduledTime="08:00"
          onConfirm={handleBookingConfirm}
          isLoading={loadingBooking === selectedCourse?.id}
        />
      </div>
    </div>
  );
};

export default BookingHistory;