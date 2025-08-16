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
    courseId: string;
    scheduledDate: string;
    scheduledTime: string;
  } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  // Load data from Supabase
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

        // Load courses for user's gym
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            *,
            course_categories(name, color_hex, icon_name),
            instructors(
              user_id,
              profiles(first_name, last_name, email)
            ),
            course_schedules(*)
          `)
          .eq('gym_id', userGym)
          .eq('is_active', true);

        if (coursesError) throw coursesError;

        // Load user's bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'confirmed');

        if (bookingsError) throw bookingsError;
        
        console.log('User bookings loaded:', bookingsData);

        // Load categories for filters
        const { data: categoriesData } = await supabase
          .from('course_categories')
          .select('name')
          .eq('gym_id', userGym)
          .eq('is_active', true);

        const categoryNames = ['Tutti', ...(categoriesData?.map(c => c.name) || [])];

        setCourses(coursesData || []);
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
  }, [user, toast]);

  const openBookingDialog = async (course: any, scheduledDate: string, scheduledTime: string) => {
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

    // Count current bookings for this course on this date/time
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('course_id', course.id)
      .eq('scheduled_date', scheduledDate)
      .eq('scheduled_time', scheduledTime)
      .eq('status', 'confirmed');

    const currentBookings = bookings?.length || 0;
    const totalSpots = course.max_participants;
    const reservedSpots = course.reserved_spots || 0;
    const publicSpots = totalSpots - reservedSpots;

    // Check availability based on user status
    if (hasCreditsOrUnlimitedAccess) {
      // Users with credits/unlimited access can book if total spots available
      if (currentBookings >= totalSpots) {
        toast({
          title: "Corso al completo",
          description: "Non ci sono più posti disponibili per questo corso",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Users without credits can only book if public spots available
      if (currentBookings >= publicSpots) {
        // Show reserved spots dialog if there are reserved spots remaining
        if (currentBookings < totalSpots && reservedSpots > 0) {
          setSelectedCourse({ ...course, scheduledDate, scheduledTime });
          setShowReservedSpotsDialog(true);
          return;
        } else {
          toast({
            title: "Corso al completo",
            description: "Non ci sono più posti disponibili per questo corso",
            variant: "destructive",
          });
          return;
        }
      }
    }

    setSelectedCourse(course);
    setPendingBookingData({
      courseId: course.id,
      scheduledDate,
      scheduledTime
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
    
    setLoadingBooking(pendingBookingData.courseId);
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

      // Create booking
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          course_id: pendingBookingData.courseId,
          scheduled_date: pendingBookingData.scheduledDate,
          scheduled_time: pendingBookingData.scheduledTime,
          status: 'confirmed',
          credits_used: hasUnlimitedAccess ? 0 : creditsRequired
        })
        .select()
        .single();

      if (error) throw error;

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
          ? "Corso prenotato con successo! (Abbonamento illimitato)"
          : `Corso prenotato con successo! Utilizzati ${creditsRequired} crediti.`,
      });
      setBookingDialogOpen(false);
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
    
    setLoadingBooking(selectedBooking.course_id);
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

  const isBooked = (courseId: string) => {
    return bookings.some(b => b.course_id === courseId);
  };

  // Filter courses based on selected filters
  const filteredCourses = courses.filter(course => {
    const categoryMatch = selectedCategory === 'Tutti' || course.course_categories?.name === selectedCategory;
    const levelMatch = selectedLevel === 'Tutti' || course.difficulty_level?.toString() === selectedLevel;
    
    let availabilityMatch = true;
    if (selectedAvailability === 'Disponibili') {
      availabilityMatch = !isBooked(course.id);
    } else if (selectedAvailability === 'Prenotati') {
      availabilityMatch = isBooked(course.id);
    }
    
    return categoryMatch && levelMatch && availabilityMatch;
  });

  // Group filtered courses by day
  const coursesByDay = filteredCourses.reduce((acc, course) => {
    if (course.course_schedules && course.course_schedules.length > 0) {
      course.course_schedules.forEach((schedule: any) => {
        const day = weekDays[schedule.day_of_week] || 'Lunedì';
        if (!acc[day]) acc[day] = [];
        acc[day].push({ ...course, schedule });
      });
    }
    return acc;
  }, {} as { [key: string]: any[] });

  const getActionButton = (course: any) => {
    const courseIsBooked = isBooked(course.id);
    const isLoading = loadingBooking === course.id;
    
    if (isLoading) {
      return <Button size="sm" disabled>...</Button>;
    }
    
    if (courseIsBooked) {
      const booking = bookings.find(b => b.course_id === course.id);
      return (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => openCancellationDialog(course, booking)}
        >
          Disdici
        </Button>
      );
    }
    
    return (
      <Button 
        size="sm" 
        className="bg-success text-success-foreground hover:bg-success/90"
        onClick={() => openBookingDialog(course, new Date().toISOString().split('T')[0], course.schedule?.start_time || '19:00')}
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
  const weekInfo = getWeekDates(currentWeek);
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
          <p className="text-sm text-muted-foreground">{weekInfo.formatRange}</p>
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
                    `${course.instructors.profiles.first_name} ${course.instructors.profiles.last_name}` : 
                    'Istruttore';
                  
                  return (
                    <Card key={`${course.id}-${course.schedule.id}`} className="shadow-card hover:shadow-lg transition-all duration-300">
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
                                <span>{course.schedule?.start_time}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{course.max_participants} posti</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1">
                              Istruttore: {instructorName}
                            </p>
                          </div>
                          
                          {/* Status and Action */}
                          <div className="flex flex-col items-end gap-2">
                            {isBooked(course.id) ? (
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
        onConfirm={handleBookingConfirm}
        isLoading={loadingBooking === pendingBookingData?.courseId}
      />

      <CancellationConfirmDialog
        open={cancellationDialogOpen}
        onOpenChange={setCancellationDialogOpen}
        course={selectedCourse || {}}
        booking={selectedBooking || {}}
        onConfirm={handleCancellationConfirm}
        isLoading={loadingBooking === selectedBooking?.course_id}
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