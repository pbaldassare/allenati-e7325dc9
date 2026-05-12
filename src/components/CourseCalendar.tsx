import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, User, Users, MapPin, Filter, ChevronLeft, ChevronRight, X, Sparkles, Zap, Star, Trophy, Activity, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGym } from "@/contexts/GymContext";
import { useToast } from "@/hooks/use-toast";
import { BookingConfirmDialog } from "@/components/dialogs/BookingConfirmDialog";
import { CancellationConfirmDialog } from "@/components/dialogs/CancellationConfirmDialog";
import { ReservedSpotsDialog } from "@/components/dialogs/ReservedSpotsDialog";
import { processBooking, checkBookingEligibility, BookingData, getUserGymCredits } from '@/lib/bookingHelpers';
import { hasActiveUnlimitedSubscription } from '@/lib/subscriptionHelpers';
import { cn } from "@/lib/utils";

// Icon mapping
const courseIcons = {
  'Functional Training': Users,
  'Cardio': Users,
  'Strength Training': Users,
  'Pilates': Users,
  'CrossFit': Users,
  'BJJ': Users,
  'MMA': Users,
  'Boxing': Users,
  'Wrestling': Users,
  'Muay Thai': Users,
  'Yoga': Users,
  'Functional': Users,
  'Grappling': Users
};

// Date helpers
const getWeekDates = (weekOffset: number = 0) => {
  const today = new Date();
  const currentWeek = new Date(today.setDate(today.getDate() - today.getDay() + (weekOffset * 7)));
  const weekStart = new Date(currentWeek);
  const weekEnd = new Date(currentWeek);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return {
    start: weekStart,
    end: weekEnd,
    formatRange: `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`
  };
};

const weekDays = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export const CourseCalendar = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');
  const [selectedLevel, setSelectedLevel] = useState<string>('Tutti');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('Tutti');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);
  const [courses, setCourses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showReservedSpotsDialog, setShowReservedSpotsDialog] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<{
    sessionId?: string;
    courseId: string;
    scheduledDate: string;
    scheduledTime: string;
  } | null>(null);

  const { user } = useAuth();
  const { selectedGym } = useGym();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load data from Supabase - using course_sessions for exact sessions
  useEffect(() => {
    const loadData = async () => {
      if (!user || !selectedGym) return;
      
      setLoading(true);
      try {
        const userGym = selectedGym.id;

        // Get courses where user has active bookings
        const { data: userBookings } = await supabase
          .from('bookings')
          .select('course_id')
          .eq('user_id', user.id)
          .eq('status', 'confirmed');

        const userCourseIds = [...new Set(userBookings?.map(b => b.course_id) || [])];

        // Load course sessions for current week + all future sessions from enrolled courses
        const weekInfo = getWeekDates(currentWeek);
        const weekStart = weekInfo.start.toISOString().split('T')[0];
        const weekEnd = weekInfo.end.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        // Build query conditions
        let query = supabase
          .from('course_sessions')
          .select(`
            *,
            instructor_override:instructors!course_sessions_instructor_id_override_fkey(id, first_name, last_name, profiles(first_name, last_name)),
            courses!inner(
              id,
              name,
              description,
              gym_id,
              instructor_id,
              credits_required,
              max_participants,
              is_active,
              course_categories(name, color_hex, icon_name),
              instructors!courses_instructor_id_fkey(id, first_name, last_name, profiles(first_name, last_name, email))
            )
          `)
          .eq('courses.gym_id', userGym)
          .eq('courses.is_active', true)
          .eq('status', 'scheduled')
          .gte('session_date', today); // Only future sessions

        // Include current week sessions OR sessions from enrolled courses
        if (userCourseIds.length > 0) {
          query = query.or(`and(session_date.gte.${weekStart},session_date.lte.${weekEnd}),course_id.in.(${userCourseIds.map(id => `"${id}"`).join(',')})`);
        } else {
          query = query.gte('session_date', weekStart).lte('session_date', weekEnd);
        }

        const { data: sessionsData, error: sessionsError } = await query
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (sessionsError) throw sessionsError;

        // Transform sessions data to match component expectations
        const sessionsWithInstructors = sessionsData?.map(session => ({
          ...session.courses,
          session_id: session.id,
          session_date: session.session_date,
          session_start_time: session.start_time,
          session_end_time: session.end_time,
          session_room_name: session.room_name,
          session_max_participants: session.max_participants,
          session_available_spots: session.available_spots,
          instructors: session.courses?.instructors || null,
          isFromEnrolledCourse: userCourseIds.includes(session.course_id)
        })) || [];

        // Load user's bookings with session_id
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'confirmed');

        if (bookingsError) throw bookingsError;
        
        console.log('User bookings loaded:', bookingsData);
        console.log('Sessions with instructors loaded:', sessionsWithInstructors);

        // Load categories for filters
        const { data: categoriesData } = await supabase
          .from('course_categories')
          .select('name')
          .eq('gym_id', userGym)
          .eq('is_active', true);

        const categoryNames = ['Tutti', ...(categoriesData?.map(c => c.name) || [])];

        setCourses(sessionsWithInstructors);
        setBookings(bookingsData || []);
        setCategories(categoryNames);
        
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Errore",
          description: "Errore nel caricamento dei dati",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, currentWeek, toast]);

  const openBookingDialog = async (session: any) => {
    console.log('Opening booking dialog for session:', { sessionId: session.session_id, courseId: session.id });
    
    if (!user || !selectedGym) return;
    
    // Check user eligibility using unified logic (pass session date for expiry check)
    const eligibility = await checkBookingEligibility(
      user.id, 
      selectedGym.id, 
      session.credits_required || 1,
      session.session_date // Pass session date to check against subscription expiry
    );

    const hasCreditsOrUnlimitedAccess = eligibility.canBook;

    // Use session's available spots instead of counting bookings
    const availableSpots = session.session_available_spots || 0;
    const totalSpots = session.session_max_participants || session.max_participants;
    const reservedSpots = session.reserved_spots || 0;
    const publicSpots = totalSpots - reservedSpots;

    // Check availability based on user status
    if (hasCreditsOrUnlimitedAccess) {
      // Users with credits/unlimited access can book if spots available
      if (availableSpots <= 0) {
        toast({
          title: "Corso al completo",
          description: "Non ci sono più posti disponibili per questa sessione",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Users without credits can only book if public spots available
      const bookedSpots = totalSpots - availableSpots;
      if (bookedSpots >= publicSpots) {
        // Show reserved spots dialog if there are reserved spots remaining
        if (availableSpots > 0 && reservedSpots > 0) {
          setSelectedCourse({ ...session, scheduledDate: session.session_date, scheduledTime: session.session_start_time });
          setShowReservedSpotsDialog(true);
          return;
        } else {
          toast({
            title: "Corso al completo",
            description: "Non ci sono più posti disponibili per questa sessione",
            variant: "destructive",
          });
          return;
        }
      }
    }

    setSelectedCourse(session);
    setPendingBookingData({
      sessionId: session.session_id,
      courseId: session.id,
      scheduledDate: session.session_date,
      scheduledTime: session.session_start_time
    });
    setBookingDialogOpen(true);
  };

  const openCancellationDialog = (course: any, booking: any) => {
    setSelectedCourse(course);
    setSelectedBooking(booking);
    setCancellationDialogOpen(true);
  };

  const handleBookingConfirm = async () => {
    if (!user || !pendingBookingData || !selectedGym) return;
    
    const sessionKey = pendingBookingData.sessionId || `${pendingBookingData.courseId}-${pendingBookingData.scheduledDate}-${pendingBookingData.scheduledTime}`;
    setLoadingBooking(sessionKey);
    try {
      const bookingData: BookingData = {
        sessionId: pendingBookingData.sessionId,
        courseId: pendingBookingData.courseId,
        gymId: selectedGym.id,
        scheduledDate: pendingBookingData.scheduledDate,
        scheduledTime: pendingBookingData.scheduledTime,
        creditsRequired: selectedCourse?.credits_required || 1
      };

      const result = await processBooking(user.id, bookingData);

      if (!result.success) {
        throw new Error(result.message);
      }

      // Send booking confirmation email
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('user_id', user.id)
          .single();

        const { data: gym } = await supabase
          .from('gyms')
          .select('name, address, city')
          .eq('id', selectedCourse.gym_id)
          .single();

        const { data: instructor } = await supabase
          .from('instructors')
          .select('first_name, last_name')
          .eq('id', selectedCourse.instructor_id)
          .single();

        if (profile && gym && instructor) {
          await supabase.functions.invoke('send-booking-confirmation', {
            body: {
              bookingId: result.bookingId,
              userEmail: profile.email,
              userName: `${profile.first_name} ${profile.last_name}`,
              courseName: selectedCourse.name,
              scheduledDate: pendingBookingData.scheduledDate,
              scheduledTime: pendingBookingData.scheduledTime,
              gymName: gym.name,
              gymAddress: `${gym.address}, ${gym.city}`,
              instructorName: `${instructor.first_name} ${instructor.last_name}`,
              creditsUsed: bookingData.creditsRequired,
            }
          });
        }
      } catch (emailError) {
        console.error('Error sending booking confirmation email:', emailError);
        // Don't fail the booking if email fails
      }

      // Refresh bookings list
      const { data: updatedBookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');

      setBookings(updatedBookings || []);
      
      toast({
        title: "Prenotazione confermata", 
        description: result.message,
      });
      setBookingDialogOpen(false);
      
      // Refresh data to update available spots
      const loadData = async () => {
        if (selectedGym) {
          const weekInfo = getWeekDates(currentWeek);
          const weekStart = weekInfo.start.toISOString().split('T')[0];
          const weekEnd = weekInfo.end.toISOString().split('T')[0];

          const { data: sessionsData } = await supabase
            .from('course_sessions')
            .select(`
              *,
              courses!inner(
                *,
                course_categories(name, color_hex, icon_name),
                instructors!courses_instructor_id_fkey(*)
              )
            `)
            .eq('courses.gym_id', selectedGym.id)
            .eq('courses.is_active', true)
            .eq('status', 'scheduled')
            .gte('session_date', weekStart)
            .lte('session_date', weekEnd);

          if (sessionsData) {
            const transformedSessions = sessionsData.map(session => ({
              ...session.courses,
              session_id: session.id,
              session_date: session.session_date,
              session_start_time: session.start_time,
              session_end_time: session.end_time,
              session_room_name: session.room_name,
              session_max_participants: session.max_participants,
              session_available_spots: session.available_spots,
            }));
            setCourses(transformedSessions);
          }
        }
      };
      loadData();
      
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'operazione",
        variant: "destructive",
      });
    } finally {
      setLoadingBooking(null);
      setPendingBookingData(null);
    }
  };

  const handleCancellationConfirm = async () => {
    if (!selectedBooking) return;
    
    const sessionKey = `${selectedBooking.course_id}-${selectedBooking.scheduled_date}-${selectedBooking.scheduled_time}`;
    setLoadingBooking(sessionKey);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
      toast({
        title: "Prenotazione cancellata",
        description: "Hai cancellato la prenotazione con successo",
      });
      setCancellationDialogOpen(false);
    } catch (error) {
      console.error('Cancellation error:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'operazione",
        variant: "destructive",
      });
    } finally {
      setLoadingBooking(null);
      setSelectedBooking(null);
    }
  };

  // Check if specific session is booked (prefer session_id, fallback to course + date + time)
  const isSessionBooked = (sessionId?: string, courseId?: string, date?: string, time?: string) => {
    if (sessionId) {
      return bookings.some(b => b.session_id === sessionId && b.status === 'confirmed');
    }
    return bookings.some(b => 
      b.course_id === courseId && 
      b.scheduled_date === date && 
      b.scheduled_time === time &&
      b.status === 'confirmed'
    );
  };

  // Get booking for specific session
  const getSessionBooking = (sessionId?: string, courseId?: string, date?: string, time?: string) => {
    if (sessionId) {
      return bookings.find(b => b.session_id === sessionId && b.status === 'confirmed');
    }
    return bookings.find(b => 
      b.course_id === courseId && 
      b.scheduled_date === date && 
      b.scheduled_time === time &&
      b.status === 'confirmed'
    );
  };

  // Filter sessions based on selected filters
  const filteredSessions = courses.filter(session => {
    const categoryMatch = selectedCategory === 'Tutti' || session.course_categories?.name === selectedCategory;
    const levelMatch = selectedLevel === 'Tutti' || session.difficulty_level?.toString() === selectedLevel;
    
    let availabilityMatch = true;
    if (selectedAvailability === 'Disponibili' || selectedAvailability === 'Prenotati') {
      const sessionBooked = isSessionBooked(session.session_id, session.id, session.session_date, session.session_start_time);
      availabilityMatch = selectedAvailability === 'Disponibili' ? !sessionBooked : sessionBooked;
    }
    
    return categoryMatch && levelMatch && availabilityMatch;
  });

  // Group filtered sessions by day
  const coursesByDay = filteredSessions.reduce((acc, session) => {
    const sessionDate = new Date(session.session_date);
    const dayOfWeek = sessionDate.getDay();
    const day = weekDays[dayOfWeek] || 'Lunedì';
    
    if (!acc[day]) acc[day] = [];
    
    // Each session is a separate entry
    acc[day].push({ 
      ...session,
      sessionKey: session.session_id || `${session.id}-${session.session_date}-${session.session_start_time}`
    });
    
    return acc;
  }, {} as { [key: string]: any[] });

  const getActionButton = (session: any) => {
    const sessionIsBooked = isSessionBooked(session.session_id, session.id, session.session_date, session.session_start_time);
    const isLoading = loadingBooking === session.sessionKey;
    
    if (isLoading) {
      return <Button size="sm" disabled>...</Button>;
    }
    
    if (sessionIsBooked) {
      const booking = getSessionBooking(session.session_id, session.id, session.session_date, session.session_start_time);
      return (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => openCancellationDialog(session, booking)}
        >
          Disdici
        </Button>
      );
    }
    
    return (
      <Button 
        size="sm" 
        className="bg-success text-success-foreground hover:bg-success/90"
        onClick={() => openBookingDialog(session)}
      >
        Prenota
      </Button>
    );
  };

  const getOccupancyColor = (participants: number, maxParticipants: number) => {
    const occupancyRate = maxParticipants > 0 ? participants / maxParticipants : 0;
    
    if (occupancyRate >= 0.9) return 'bg-destructive/20 border-destructive/30';
    if (occupancyRate >= 0.7) return 'bg-warning/20 border-warning/30';
    if (occupancyRate >= 0.4) return 'bg-primary/20 border-primary/30';
    return 'bg-success/20 border-success/30';
  };

  const clearFilters = () => {
    setSelectedCategory('Tutti');
    setSelectedLevel('Tutti');
    setSelectedAvailability('Tutti');
  };

  const hasActiveFilters = selectedCategory !== 'Tutti' || selectedLevel !== 'Tutti' || selectedAvailability !== 'Tutti';
  const levelFilters = ['Tutti', '1', '2', '3'];
  const availabilityFilters = ['Tutti', 'Disponibili', 'Prenotati'];

  if (loading) {
    return (
      <div className="pb-20 px-4 space-y-6">
        <div className="pt-8 pb-4 text-center">
          <div className="relative inline-block">
            <h1 className="text-3xl font-bold bg-gradient-text bg-clip-text text-transparent">
              Calendario Corsi
            </h1>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-secondary animate-pulse" />
          </div>
          <p className="text-muted-foreground mt-2 animate-pulse">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="pt-8 pb-4 relative">
        <div className="absolute inset-0 bg-gradient-primary opacity-5 rounded-2xl" />
        <div className="flex items-center justify-between relative z-10 p-4">
          <div>
            <div className="relative inline-block">
              <h1 className="text-3xl font-bold bg-gradient-text bg-clip-text text-transparent">
                Calendario Corsi
              </h1>
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-secondary animate-pulse" />
            </div>
            <p className="text-muted-foreground mt-1 font-medium">Prenota i tuoi corsi preferiti</p>
          </div>
          
          {/* Filters Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="relative hover:bg-gradient-primary hover:text-white hover:border-primary transition-all duration-300 group"
              >
                <Filter className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                Filtri
                {hasActiveFilters && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background border shadow-glow">
              {/* Filtri content */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-subtle rounded-2xl border border-primary/20">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setCurrentWeek(prev => prev - 1)}
          className="hover:bg-gradient-secondary hover:text-white hover:border-secondary transition-all duration-300 group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-bold bg-gradient-text bg-clip-text text-transparent">
            {currentWeek === 0 ? 'Settimana corrente' : 
             currentWeek > 0 ? `Settimana +${currentWeek}` : 
             `Settimana ${currentWeek}`}
          </h2>
          <p className="text-sm text-muted-foreground font-medium">{getWeekDates(currentWeek).formatRange}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setCurrentWeek(prev => prev + 1)}
          className="hover:bg-gradient-accent hover:text-white hover:border-accent transition-all duration-300 group"
        >
          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      {/* Calendar Days */}
      <div className="space-y-6">
        {weekDays.map((day, index) => {
          const dayColors = [
            'border-red-400', 'border-orange-400', 'border-yellow-400', 
            'border-green-400', 'border-blue-400', 'border-purple-400', 'border-pink-400'
          ];
          const dayGradients = [
            'bg-gradient-to-r from-red-500/10 to-orange-500/10',
            'bg-gradient-to-r from-orange-500/10 to-yellow-500/10',
            'bg-gradient-to-r from-yellow-500/10 to-green-500/10',
            'bg-gradient-to-r from-green-500/10 to-blue-500/10',
            'bg-gradient-to-r from-blue-500/10 to-purple-500/10',
            'bg-gradient-to-r from-purple-500/10 to-pink-500/10',
            'bg-gradient-to-r from-pink-500/10 to-red-500/10'
          ];
          
          return (
          <div key={day} className="space-y-3">
            <div className={`flex items-center gap-3 p-3 rounded-xl ${dayGradients[index]} border-l-4 ${dayColors[index]}`}>
              <h3 className="text-lg font-bold bg-gradient-text bg-clip-text text-transparent">
                {day}
              </h3>
              <Star className="w-4 h-4 text-primary animate-pulse" />
            </div>
            
            {coursesByDay[day] && coursesByDay[day].length > 0 ? (
              <div className="space-y-3">
                {coursesByDay[day].map((course) => {
                  const instructorName = course.instructors?.profiles ? 
                    `${course.instructors.profiles.first_name || ''} ${course.instructors.profiles.last_name || ''}`.trim() || course.instructors.profiles.email?.split('@')[0] : 
                    'Istruttore';
                  
                  const participants = (course.session_max_participants || course.max_participants) - (course.session_available_spots || 0);
                  const maxParticipants = course.session_max_participants || course.max_participants;
                  
                  return (
                    <Card 
                      key={course.sessionKey}
                      className={cn(
                        "p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4",
                        getOccupancyColor(participants, maxParticipants)
                      )}
                    >
                      <div className="flex items-center justify-between">
                        {/* Colonna sinistra - Info corso */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base truncate">
                              {course.name}
                            </h3>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              🕐 {course.session_start_time?.slice(0, 5)} - {course.session_end_time?.slice(0, 5)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              📍 {course.session_room_name || 'Sala non specificata'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              👤 {instructorName}
                            </p>
                            {course.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                                {course.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Colonna destra - Occupancy e azioni */}
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <Badge 
                            variant={
                              participants >= maxParticipants 
                                ? "destructive" 
                                : participants >= maxParticipants * 0.8 
                                  ? "secondary" 
                                  : "default"
                            }
                            className="text-xs"
                          >
                            {participants}/{maxParticipants}
                          </Badge>
                          
                          <div className="text-xs text-muted-foreground text-right">
                            {course.credits_required} {course.credits_required === 1 ? 'credito' : 'crediti'}
                          </div>
                          
                          {/* Progress bar occupancy */}
                          <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                participants >= maxParticipants * 0.9 
                                  ? "bg-destructive" 
                                  : participants >= maxParticipants * 0.7 
                                    ? "bg-warning" 
                                    : "bg-primary"
                              }`}
                              style={{ 
                                width: `${Math.min((participants / maxParticipants) * 100, 100)}%` 
                              }}
                            />
                          </div>
                          
                          {/* Bottoni azione */}
                          <div className="flex gap-2 mt-2">
                            {getActionButton(course)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="shadow-card bg-gradient-subtle border-primary/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-primary opacity-5" />
                <CardContent className="p-8 text-center relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="w-8 h-8 text-primary animate-pulse" />
                    <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {hasActiveFilters ? 'Nessun corso corrispondente ai filtri' : 'Nessun corso programmato'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )})}
      </div>

      <BookingConfirmDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        course={selectedCourse || {}}
          scheduledDate={pendingBookingData?.scheduledDate || ''}
          scheduledTime={pendingBookingData?.scheduledTime || ''}
          sessionId={pendingBookingData?.sessionId}
        onConfirm={handleBookingConfirm}
        isLoading={loadingBooking === `${pendingBookingData?.courseId}-${pendingBookingData?.scheduledDate}-${pendingBookingData?.scheduledTime}`}
      />

      <CancellationConfirmDialog
        open={cancellationDialogOpen}
        onOpenChange={setCancellationDialogOpen}
        course={selectedCourse || {}}
        booking={selectedBooking || {}}
        onConfirm={handleCancellationConfirm}
        isLoading={loadingBooking === `${selectedBooking?.course_id}-${selectedBooking?.scheduled_date}-${selectedBooking?.scheduled_time}`}
      />

      <ReservedSpotsDialog
        open={showReservedSpotsDialog}
        onOpenChange={setShowReservedSpotsDialog}
        courseName={selectedCourse?.name || ''}
        coursePrice={selectedCourse?.price_per_session}
        creditsRequired={selectedCourse?.credits_required || 1}
        availableSpots={selectedCourse ? Math.max(0, (selectedCourse.max_participants - (selectedCourse.reserved_spots || 0)) - (selectedCourse.currentBookings || 0)) : 0}
        reservedSpots={selectedCourse?.reserved_spots || 0}
        publicSpots={selectedCourse ? selectedCourse.max_participants - (selectedCourse.reserved_spots || 0) : 0}
      />
    </div>
  );
};