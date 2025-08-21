import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Clock, User, Users, MapPin, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BookingConfirmDialog } from "@/components/dialogs/BookingConfirmDialog";
import { CancellationConfirmDialog } from "@/components/dialogs/CancellationConfirmDialog";
import { ReservedSpotsDialog } from "@/components/dialogs/ReservedSpotsDialog";

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
  const { toast } = useToast();

  // Load data from Supabase - using course_sessions for exact sessions
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Get user's gym ID
        const { data: userGym } = await supabase
          .rpc('get_user_gym_id', { _user_id: user.id });

        if (!userGym) {
          toast({
            title: "Errore",
            description: "Non sei associato a nessuna palestra",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

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
            courses!inner(
              *,
              course_categories(name, color_hex, icon_name),
              instructors(*)
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

        // Load instructor profiles separately 
        const instructorIds = sessionsData?.map(session => session.courses?.instructors?.user_id).filter(Boolean) || [];
        const { data: instructorProfiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', instructorIds);

        // Create instructor profiles map for easier lookup
        const instructorProfilesMap = new Map(
          instructorProfiles?.map(profile => [profile.user_id, profile]) || []
        );

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
          instructors: session.courses?.instructors ? {
            ...session.courses.instructors,
            profiles: instructorProfilesMap.get(session.courses.instructors.user_id)
          } : null,
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
    // Check user credits and subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_credits')
      .eq('user_id', user?.id)
      .maybeSingle();

    const { data: activeSubscription } = await supabase
      .from('user_subscriptions')
      .select('*, subscription_plans(unlimited_access)')
      .eq('user_id', user?.id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    const hasCreditsOrUnlimitedAccess = 
      (profile && profile.current_credits > 0) || 
      (activeSubscription?.subscription_plans?.unlimited_access);

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
    if (!user || !pendingBookingData) return;
    
    const sessionKey = pendingBookingData.sessionId || `${pendingBookingData.courseId}-${pendingBookingData.scheduledDate}-${pendingBookingData.scheduledTime}`;
    setLoadingBooking(sessionKey);
    try {
      // Check if user has sufficient credits or active unlimited subscription
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_credits')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Check for active unlimited subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          subscription_plans!inner(unlimited_access)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .single();

      const hasUnlimitedAccess = subscription?.subscription_plans?.unlimited_access;
      const creditsRequired = selectedCourse?.credits_required || 1;
      const currentCredits = profile?.current_credits || 0;

      if (!hasUnlimitedAccess && currentCredits < creditsRequired) {
        toast({
          title: "Crediti insufficienti",
          description: `Ti servono ${creditsRequired} crediti per questa prenotazione. Ne hai ${currentCredits}.`,
          variant: "destructive"
        });
        return;
      }

      // Create booking with session_id
      const bookingData: any = {
        user_id: user.id,
        course_id: pendingBookingData.courseId,
        scheduled_date: pendingBookingData.scheduledDate,
        scheduled_time: pendingBookingData.scheduledTime,
        status: 'confirmed',
        credits_used: hasUnlimitedAccess ? 0 : creditsRequired
      };

      // Add session_id if available
      if (pendingBookingData.sessionId) {
        bookingData.session_id = pendingBookingData.sessionId;
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) throw error;

      // Update session available spots
      if (pendingBookingData.sessionId) {
        const { error: sessionError } = await supabase
          .from('course_sessions')
          .update({ 
            available_spots: Math.max(0, (selectedCourse?.session_available_spots || 0) - 1)
          })
          .eq('id', pendingBookingData.sessionId);

        if (sessionError) console.error('Error updating session spots:', sessionError);
      }

      // Consume credits if not unlimited subscription
      if (!hasUnlimitedAccess) {
        const newBalance = currentCredits - creditsRequired;
        
        const { error: transactionError } = await supabase
          .from('credits_transactions')
          .insert({
            user_id: user.id,
            amount: -creditsRequired,
            balance_after: newBalance,
            transaction_type: 'booking',
            description: `Prenotazione ${selectedCourse?.name}`,
            reference_id: data.id
          });

        if (transactionError) throw transactionError;
      }

      setBookings(prev => [...prev, data]);
      toast({
        title: "Prenotazione confermata", 
        description: hasUnlimitedAccess 
          ? "Sessione prenotata con successo! (Abbonamento illimitato)"
          : `Sessione prenotata con successo! Utilizzati ${creditsRequired} crediti.`,
      });
      setBookingDialogOpen(false);
      
      // Refresh data to update available spots
      const loadData = async () => {
        const { data: userGym } = await supabase.rpc('get_user_gym_id', { _user_id: user.id });
        if (userGym) {
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
                instructors(*)
              )
            `)
            .eq('courses.gym_id', userGym)
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
        description: "Si è verificato un errore durante l'operazione",
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
        <div className="pt-8 pb-4">
          <h1 className="text-3xl font-bold text-foreground">Calendario Corsi</h1>
          <p className="text-muted-foreground mt-1">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendario Corsi</h1>
            <p className="text-muted-foreground mt-1">Prenota i tuoi corsi preferiti</p>
          </div>
          
          {/* Filters Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filtri
                {hasActiveFilters && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background border shadow-lg">
              {/* Filtri content */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setCurrentWeek(prev => prev - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            {currentWeek === 0 ? 'Settimana corrente' : 
             currentWeek > 0 ? `Settimana +${currentWeek}` : 
             `Settimana ${currentWeek}`}
          </h2>
          <p className="text-sm text-muted-foreground">{getWeekDates(currentWeek).formatRange}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setCurrentWeek(prev => prev + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Days */}
      <div className="space-y-6">
        {weekDays.map((day) => (
          <div key={day} className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground border-l-4 border-primary pl-3">
              {day}
            </h3>
            
            {coursesByDay[day] && coursesByDay[day].length > 0 ? (
              <div className="space-y-3">
                {coursesByDay[day].map((course) => {
                  const IconComponent = courseIcons[course.course_categories?.name as keyof typeof courseIcons] || Users;
                  const instructorName = course.instructors?.profiles ? 
                    `${course.instructors.profiles.first_name || ''} ${course.instructors.profiles.last_name || ''}`.trim() || course.instructors.profiles.email?.split('@')[0] : 
                    'Istruttore';
                  
                  return (
                    <Card key={course.sessionKey} className="shadow-card hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-primary">
                            <IconComponent className="h-6 w-6 text-white" />
                          </div>
                          
                          {/* Course Info */}
                          <div className="flex-1">
                             <div className="flex items-center gap-2 mb-1">
                               <h4 className="font-semibold text-foreground">{course.name}</h4>
                               <Badge variant="secondary" className="text-xs font-mono">
                                 {course.session_start_time?.slice(0, 5)} - {course.session_end_time?.slice(0, 5)}
                               </Badge>
                               {course.difficulty_level && (
                                 <Badge variant="outline" className="text-xs">Livello {course.difficulty_level}</Badge>
                               )}
                               {course.course_categories?.name && (
                                 <Badge variant="outline" className="text-xs">{course.course_categories.name}</Badge>
                               )}
                             </div>
                             
                             <div className="flex items-center gap-4 text-sm text-muted-foreground">
                               <div className="flex items-center gap-1">
                                 <Clock className="h-4 w-4" />
                                 <span>{course.duration_minutes} min</span>
                               </div>
                               <div className="flex items-center gap-1">
                                 <Users className="h-4 w-4" />
                                 <span>{course.session_available_spots || 0}/{course.session_max_participants || course.max_participants} disponibili</span>
                               </div>
                               {course.session_room_name && (
                                 <div className="flex items-center gap-1">
                                   <MapPin className="h-4 w-4" />
                                   <span>{course.session_room_name}</span>
                                 </div>
                               )}
                             </div>
                            
                            <p className="text-sm text-muted-foreground mt-1">
                              Istruttore: {instructorName}
                            </p>
                          </div>
                          
                           {/* Status and Action */}
                           <div className="flex flex-col items-end gap-2">
                             {isSessionBooked(course.session_id, course.id, course.session_date, course.session_start_time) ? (
                               <Badge className="bg-primary text-primary-foreground">Prenotato</Badge>
                             ) : (
                               <Badge className="bg-success text-success-foreground">Disponibile</Badge>
                             )}
                             {getActionButton(course)}
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {hasActiveFilters ? 'Nessun corso corrispondente ai filtri' : 'Nessun corso programmato'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
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