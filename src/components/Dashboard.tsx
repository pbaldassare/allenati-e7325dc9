import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, User, Users, Trophy, Star, HelpCircle, Building2, ArrowRight, MapPin, Zap, Activity, Filter, Infinity, Coins, ShoppingCart, X, Navigation } from 'lucide-react';
import { useTour } from '@/components/AppTourContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookingConfirmDialog } from '@/components/dialogs/BookingConfirmDialog';
import { CancellationConfirmDialog } from '@/components/dialogs/CancellationConfirmDialog';
import { WaitlistConfirmDialog } from '@/components/dialogs/WaitlistConfirmDialog';
import { useGym } from '@/contexts/GymContext';
import { HowItWorksModal } from './modals/HowItWorksModal';
import WeeklyCalendarCompact from './WeeklyCalendarCompact';

import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

import { useSessionBookings } from '@/hooks/useSessionBookings';
import { useUserWaitlistStatus } from '@/hooks/useWaitlist';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GymSelectorWithLogo } from '@/components/GymSelectorWithLogo';
import { processBooking, checkBookingEligibility, BookingData } from '@/lib/bookingHelpers';
import { processWaitlistBooking, cancelWaitlistBooking, getNextWaitlistPosition, WaitlistBookingData } from '@/lib/waitlistHelpers';
import { CourseParticipantsViewModal } from './CourseParticipantsViewModal';

export const Dashboard = () => {
  const { user } = useAuth();
  const { userGyms, selectedGym } = useGym();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { startTour } = useTour();
  const { bookings, isSessionBooked, getSessionBooking, cancelSessionBooking, loading: bookingsLoading } = useSessionBookings();
  const { isInWaitlistForSession, getWaitlistPosition, getWaitlistBookingId, fetchUserWaitlistBookings } = useUserWaitlistStatus();
  const [availableSessions, setAvailableSessions] = useState([]);
  const [instructorProfiles, setInstructorProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [waitlistDialogOpen, setWaitlistDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [estimatedWaitlistPosition, setEstimatedWaitlistPosition] = useState(1);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const [userCredits, setUserCredits] = useState<number>(0);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [selectedSessionForParticipants, setSelectedSessionForParticipants] = useState<string | null>(null);

  const loadUserCreditsAndSubscription = async () => {
    if (!user || !selectedGym) return;
    
    setCreditsLoading(true);
    try {
      const gymId = selectedGym.id;
      if (!gymId) return;

      // Carica crediti per la palestra selezionata
      const { data: creditsData } = await supabase
        .from('gym_credits')
        .select('credits')
        .eq('user_id', user.id)
        .eq('gym_id', gymId)
        .single();

      // Carica abbonamento attivo per la palestra selezionata
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          expires_at,
          status,
          plan:subscription_plans(
            name,
            unlimited_access
          )
        `)
        .eq('user_id', user.id)
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .single();

      setUserCredits(creditsData?.credits || 0);
      setUserSubscription(subscriptionData);

      // Check for expired subscriptions and show warning
      const { data: expiredSubscription } = await supabase
        .from('user_subscriptions')
        .select('expires_at, subscription_plans(name)')
        .eq('user_id', user.id)
        .eq('gym_id', gymId)
        .eq('status', 'expired')
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (expiredSubscription && !subscriptionData) {
        toast({
          title: "Abbonamento Scaduto",
          description: "Il tuo abbonamento è scaduto. Acquista un nuovo piano per continuare a prenotare.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/subscriptions')}
              className="border-white text-white hover:bg-white hover:text-destructive"
            >
              Vai agli Abbonamenti
            </Button>
          ),
          duration: 10000,
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento dati crediti/abbonamento:', error);
    } finally {
      setCreditsLoading(false);
    }
  };

  // Load available sessions from Supabase
  useEffect(() => {
    const loadAvailableSessions = async () => {
      if (!user || !selectedGym?.id) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      try {
        // Load all future sessions from selected gym with instructor names via foreign key
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('course_sessions')
      .select(`
        *,
        instructor_override:instructors!course_sessions_instructor_id_override_fkey(
          first_name,
          last_name
        ),
        courses!inner(
          id,
          name,
          description,
          credits_required,
          difficulty_level,
          instructor_id,
          gym_id,
          instructors!courses_instructor_id_fkey(
            first_name,
            last_name
          ),
          course_categories(name, color_hex, icon_name),
          gyms(name)
        )
      `)
      .eq('courses.gym_id', selectedGym.id)
      .eq('courses.is_active', true)
      .eq('status', 'scheduled')
      .gte('session_date', today)
      .order('session_date', { ascending: true })
      .order('start_time', { ascending: true });

        if (sessionsError) throw sessionsError;

        // Riallinea available_spots leggendo le bookings confermate in tempo reale,
        // per evitare drift storico del campo memorizzato (vedi backfill DB).
        let normalizedSessions = sessionsData || [];
        const sessionIds = normalizedSessions.map((s: any) => s.id).filter(Boolean);
        if (sessionIds.length > 0) {
          const { data: bookingRows, error: bookingsErr } = await supabase
            .from('bookings')
            .select('session_id')
            .in('session_id', sessionIds)
            .eq('status', 'confirmed');

          if (!bookingsErr && bookingRows) {
            const counts = new Map<string, number>();
            bookingRows.forEach((b: any) => {
              counts.set(b.session_id, (counts.get(b.session_id) || 0) + 1);
            });
            normalizedSessions = normalizedSessions.map((s: any) => {
              const confirmed = counts.get(s.id) || 0;
              const max = s.max_participants || 0;
              const realAvailable = Math.max(0, Math.min(max, max - confirmed));
              return realAvailable !== s.available_spots
                ? { ...s, available_spots: realAvailable }
                : s;
            });
          }
        }

        setAvailableSessions(normalizedSessions);
        
        // Auto-select date only if none is selected and we have sessions
        if (!selectedDate && sessionsData && sessionsData.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          
          // Check if today has any sessions
          const todaySessions = sessionsData.filter(session => session.session_date === today);
          
          if (todaySessions.length > 0) {
            // Set to today if there are sessions today
            setSelectedDate(new Date());
          } else {
            // Set to the first available session date
            const firstSessionDate = sessionsData[0].session_date;
            setSelectedDate(new Date(firstSessionDate));
          }
        }
        
      } catch (error) {
        console.error('Error loading sessions:', error);
        toast({
          title: "Errore",
          description: "Errore nel caricamento delle sessioni",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAvailableSessions();
    loadUserCreditsAndSubscription();
  }, [user, selectedGym, toast]);

  const openBookingDialog = (session: any) => {
    setSelectedSession(session);
    setBookingDialogOpen(true);
  };

  const openCancellationDialog = (session: any, booking: any) => {
    setSelectedSession(session);
    setSelectedBooking(booking);
    setCancellationDialogOpen(true);
  };

  const openWaitlistDialog = async (session: any) => {
    setSelectedSession(session);
    // Get estimated position
    const position = await getNextWaitlistPosition(session.id);
    setEstimatedWaitlistPosition(position);
    setWaitlistDialogOpen(true);
  };

  const handleBookingConfirm = async () => {
    if (!user || !selectedSession || !selectedGym) return;
    
    setLoadingBooking(selectedSession.id);
    try {
      const bookingData: BookingData = {
        sessionId: selectedSession.id,
        courseId: selectedSession.course_id,
        gymId: selectedGym.id,
        scheduledDate: selectedSession.session_date,
        scheduledTime: selectedSession.start_time,
        creditsRequired: selectedSession.courses?.credits_required || 1
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
          .eq('id', selectedSession.courses?.gym_id)
          .single();

        const { data: instructor } = await supabase
          .from('instructors')
          .select('first_name, last_name')
          .eq('id', selectedSession.courses?.instructor_id)
          .single();

        if (profile && gym && instructor) {
          await supabase.functions.invoke('send-booking-confirmation', {
            body: {
              bookingId: result.bookingId,
              userEmail: profile.email,
              userName: `${profile.first_name} ${profile.last_name}`,
              courseName: selectedSession.courses?.name || 'Corso',
              scheduledDate: selectedSession.session_date,
              scheduledTime: selectedSession.start_time,
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

      toast({
        title: "Prenotazione confermata",
        description: result.message,
      });
      setBookingDialogOpen(false);
      
      // Reload data to reflect changes
      loadUserCreditsAndSubscription();
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la prenotazione",
        variant: "destructive",
      });
    } finally {
      setLoadingBooking(null);
      setSelectedSession(null);
    }
  };

  const handleCancellationConfirm = async () => {
    if (!selectedBooking) return;
    
    setLoadingBooking(selectedBooking.session_id);
    try {
      const success = await cancelSessionBooking(selectedBooking.session_id);
      
      if (success) {
        toast({
          title: "Prenotazione cancellata",
          description: "Hai cancellato la prenotazione con successo",
        });
        setCancellationDialogOpen(false);
      } else {
        throw new Error('Errore durante la cancellazione');
      }
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

  const handleWaitlistConfirm = async () => {
    if (!user || !selectedSession || !selectedGym) return;

    setLoadingBooking(selectedSession.id);
    try {
      const waitlistData: WaitlistBookingData = {
        sessionId: selectedSession.id,
        courseId: selectedSession.course_id,
        gymId: selectedGym.id,
        scheduledDate: selectedSession.session_date,
        scheduledTime: selectedSession.start_time,
        creditsRequired: selectedSession.courses?.credits_required || 1
      };

      const result = await processWaitlistBooking(user.id, waitlistData);

      if (!result.success) {
        throw new Error(result.message);
      }

      toast({
        title: "Iscritto alla lista d'attesa",
        description: result.message,
      });
      setWaitlistDialogOpen(false);
      fetchUserWaitlistBookings();
      loadUserCreditsAndSubscription();
    } catch (error: any) {
      console.error('Waitlist error:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setLoadingBooking(null);
      setSelectedSession(null);
    }
  };

  const handleCancelWaitlist = async (sessionId: string) => {
    const bookingId = getWaitlistBookingId(sessionId);
    if (!bookingId || !user) return;

    setLoadingBooking(sessionId);
    try {
      const result = await cancelWaitlistBooking(bookingId, user.id);

      if (!result.success) {
        throw new Error(result.message);
      }

      toast({
        title: "Rimosso dalla lista d'attesa",
        description: result.message,
      });
      fetchUserWaitlistBookings();
      loadUserCreditsAndSubscription();
    } catch (error: any) {
      console.error('Cancel waitlist error:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setLoadingBooking(null);
    }
  };

  const isSessionBookedByUser = (sessionId: string) => {
    return isSessionBooked(sessionId);
  };

  const getInstructorName = (session: any) => {
    // Session-level override takes priority
    let override = session.instructor_override;
    if (Array.isArray(override)) override = override[0];
    if (override) {
      const fullName = `${override.first_name || ''} ${override.last_name || ''}`.trim();
      if (fullName) return fullName;
    }

    let instructor = session.courses?.instructors;
    if (Array.isArray(instructor)) instructor = instructor[0];
    if (!instructor) return 'Istruttore non assegnato';

    const fullName = `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim();
    return fullName || 'Istruttore non assegnato';
  };

  const getInstructorAvatar = (session: any) => {
    // For now return null, we can add profile_picture_url to instructors table later if needed
    return null;
  };

  const getSessionProgress = (session: any) => {
    const taken = session.max_participants - session.available_spots;
    const max = session.max_participants || 1;
    return (taken / max) * 100;
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(selectedDate?.toDateString() === date.toDateString() ? null : date);
  };

  const filteredAvailableSessions = availableSessions.filter(session => {
    // Filter by category
    if (activeFilter !== 'all' && !session.courses?.course_categories?.name.toLowerCase().includes(activeFilter.toLowerCase())) {
      return false;
    }
    
    // Filter by selected date
    if (selectedDate) {
      // Ensure proper date comparison by normalizing both dates to YYYY-MM-DD format
      const sessionDate = new Date(session.session_date);
      const selectedDateNormalized = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const sessionDateNormalized = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
      
      // Debug logging
      console.log('Date filter debug:', {
        selectedDate: selectedDate.toISOString().split('T')[0],
        sessionDate: session.session_date,
        sessionDateFormatted: sessionDate.toISOString().split('T')[0],
        matches: sessionDateNormalized.getTime() === selectedDateNormalized.getTime()
      });
      
      return sessionDateNormalized.getTime() === selectedDateNormalized.getTime();
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="pb-20 px-4 space-y-6">
        <div className="pt-6 pb-4">
          <div className="h-8 bg-gradient-primary rounded-lg w-48 animate-pulse mb-2"></div>
          <div className="h-5 bg-muted rounded w-64 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 space-y-4">
      {/* Modern Header */}
      <div className="pt-6 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 data-tour="user-greeting" className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Ciao{user?.first_name ? `, ${user.first_name}` : ''}! 👋
            </h1>
            <p className="text-muted-foreground text-base md:text-lg font-medium">
              Benvenuto nella tua palestra
            </p>
            
            <Button
              data-tour="user-how-it-works"
              onClick={() => setShowHowItWorksModal(true)}
              variant="outline"
              size="sm"
              className="mt-3 text-primary border-primary/20 hover:bg-primary/5"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Come funziona l'app
            </Button>
            <Button
              onClick={() => startTour('user')}
              variant="outline"
              size="sm"
              className="mt-2 text-primary border-primary/20 hover:bg-primary/5"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Tour guidato
            </Button>
          </div>
          
          {/* Gym Selector with Logo */}
          <div data-tour="user-gym-selector" className="flex items-center gap-2 ml-2 sm:ml-4 flex-shrink-0">
            <GymSelectorWithLogo />
          </div>
        </div>
      </div>

      {/* Summary Stats - Moved to top */}
      <div className="grid grid-cols-2 gap-3">
        <Card data-tour="user-stats-sessions" className="bg-gradient-primary border-none shadow-primary cursor-pointer text-white hover:shadow-glow transition-all duration-300" onClick={() => navigate('/i-miei-corsi')}>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-white/80" />
            <div className="text-2xl font-bold text-white">
              {(() => {
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                const currentTime = now.toTimeString().split(' ')[0];
                
                return bookings.filter(booking => {
                  const bookingDate = booking.scheduled_date;
                  const bookingTime = booking.scheduled_time;
                  
                  // Include future dates
                  if (bookingDate > today) return true;
                  
                  // For today, include sessions that haven't started yet
                  if (bookingDate === today && bookingTime > currentTime) return true;
                  
                  return false;
                }).length;
              })()}
            </div>
            <p className="text-xs text-white/80">Prossime Sessioni</p>
          </CardContent>
        </Card>
        <Card 
          data-tour="user-stats-credits"
          className={`cursor-pointer transition-all duration-300 border-none shadow-card hover:shadow-glow ${
            creditsLoading 
              ? 'bg-gradient-to-br from-muted/10 to-muted/5' 
              : userSubscription?.plan?.unlimited_access
                ? 'bg-gradient-success text-white'
                : userCredits > 0
                  ? 'bg-gradient-warm text-white'
                  : 'bg-gradient-energy text-white'
          }`}
          onClick={() => navigate('/subscriptions')}
        >
          <CardContent className="p-4 text-center">
            {creditsLoading ? (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground">Caricamento...</p>
              </>
            ) : userSubscription?.plan?.unlimited_access ? (
              <>
                <Infinity className="h-5 w-5 mx-auto mb-1 text-white/80" />
                <div className="text-2xl font-bold text-white">{userSubscription.plan.name}</div>
                <p className="text-xs text-white/80">Abbonamento Attivo</p>
              </>
            ) : userCredits > 0 ? (
              <>
                <Coins className="h-5 w-5 mx-auto mb-1 text-white/80" />
                <div className="text-2xl font-bold text-white">{userCredits}</div>
                <p className="text-xs text-white/80">Crediti Disponibili</p>
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-white/80" />
                <div className="text-lg font-bold text-white">Acquista</div>
                <p className="text-xs text-white/80">Crediti o Abbonamento</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar Section with Toggle */}
      <Card data-tour="user-calendar" className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Calendario</h3>
          </div>

          <WeeklyCalendarCompact onDayClick={handleDayClick} selectedDate={selectedDate} />
        </CardContent>
      </Card>


      {/* Sessioni Disponibili - Session-based Booking */}
      <Card data-tour="user-session-list" className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <Zap className="h-6 w-6 text-primary" />
              Sessioni Disponibili
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {selectedDate.toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Filter className="h-4 w-4" />
                  Mostra Tutti
                </Button>
              )}
            </div>
          </div>
          <CardDescription className="text-sm font-medium">
            {selectedDate 
              ? `Sessioni disponibili per ${selectedDate.toLocaleDateString('it-IT', { weekday: 'long' })}`
              : 'Prenota le sessioni disponibili nelle tue palestre'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Debug information */}
          {selectedDate && (
            <div className="text-xs bg-muted/50 p-2 rounded text-muted-foreground">
              Filtro attivo: {selectedDate.toLocaleDateString('it-IT')} ({filteredAvailableSessions.length} sessioni trovate)
            </div>
          )}
          
          {filteredAvailableSessions.length > 0 ? (
            filteredAvailableSessions.map((session) => {
              const instructorName = getInstructorName(session);
              const instructorAvatar = getInstructorAvatar(session);
              const progress = getSessionProgress(session);
              const isLoading = loadingBooking === session.id;
              const categoryColor = session.courses?.course_categories?.color_hex || '#3B82F6';
              const spotsLeft = session.available_spots;
              const isAlmostFull = spotsLeft <= 3 && spotsLeft > 0;
              const isFull = spotsLeft <= 0;
              const isAlreadyBooked = isSessionBookedByUser(session.id);
              
              const participants = session.max_participants - session.available_spots;
              const getOccupancyColor = (participants: number, maxParticipants: number) => {
                const occupancyRate = participants / maxParticipants;
                if (occupancyRate >= 1) {
                  return "border-destructive/30 bg-destructive/20";
                } else if (occupancyRate >= 0.8) {
                  return "border-warning/30 bg-warning/20";
                } else {
                  return "border-success/30 bg-success/20";
                }
              };

              return (
                <Card 
                  key={session.id}
                  className={cn(
                    "p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4",
                    getOccupancyColor(participants, session.max_participants),
                    isAlreadyBooked && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-center justify-between">
                    {/* Colonna sinistra - Info corso */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">
                          {session.courses?.name}
                        </h3>
                        {isAlreadyBooked && (
                          <Badge className="text-xs bg-gradient-success text-white border-none">
                            ✓ Prenotato
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          🕐 {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          📍 {session.room_name || 'Sala non specificata'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          👤 {instructorName}
                        </p>
                        {session.courses?.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                            {session.courses.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Colonna destra - Occupancy e azioni */}
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <Badge 
                        variant={
                          session.available_spots <= 0
                            ? "destructive" 
                            : session.available_spots <= session.max_participants * 0.2
                              ? "secondary" 
                              : "default"
                        }
                        className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSessionForParticipants(session.id);
                        }}
                        title="Clicca per vedere i partecipanti"
                      >
                        {participants}/{session.max_participants}
                      </Badge>
                      
                      <div className="text-xs text-muted-foreground text-right">
                        {session.courses?.credits_required} {session.courses?.credits_required === 1 ? 'credito' : 'crediti'}
                      </div>
                      
                      {/* Progress bar occupancy */}
                      <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-300",
                            session.available_spots <= session.max_participants * 0.1 
                              ? "bg-destructive" 
                              : session.available_spots <= session.max_participants * 0.3 
                                ? "bg-warning" 
                                : "bg-primary"
                          )}
                          style={{ 
                            width: `${Math.min((participants / session.max_participants) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      
                      {/* Bottoni azione */}
                      <div className="flex gap-2 mt-2">
                        {isAlreadyBooked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const booking = getSessionBooking(session.id, session.courses?.id, session.session_date, session.start_time);
                              if (booking) {
                                openCancellationDialog(booking.course, booking);
                              }
                            }}
                            disabled={isLoading}
                          >
                            Disdici
                          </Button>
                        ) : isInWaitlistForSession(session.id) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelWaitlist(session.id)}
                            disabled={isLoading}
                            className="gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            #{getWaitlistPosition(session.id)} - Esci
                          </Button>
                        ) : isFull ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openWaitlistDialog(session)}
                            disabled={isLoading}
                            className="gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            Lista d'Attesa
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => openBookingDialog(session)}
                            disabled={isLoading}
                          >
                            {isLoading ? "..." : "Prenota"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
             })
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Zap className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-3 bg-gradient-primary bg-clip-text text-transparent">
                  Nessuna sessione disponibile
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {(() => {
                    const today = new Date().toISOString().split('T')[0];
                    const selectedDateStr = selectedDate?.toISOString().split('T')[0];
                    
                    // If viewing past dates, show specific message
                    if (selectedDateStr && selectedDateStr < today) {
                      return "Non ci sono sessioni per questa data passata.";
                    }
                    
                    return "Al momento non ci sono sessioni disponibili nelle tue palestre. Controlla più tardi o esplora altre opzioni.";
                  })()}
                </p>
              </div>
            )}
         </CardContent>
       </Card>


        <BookingConfirmDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          course={selectedSession ? {
            ...(selectedSession.courses || {}),
            instructor_override: selectedSession.instructor_override,
          } : {}}
          scheduledDate={selectedSession?.session_date || new Date().toISOString().split('T')[0]}
          scheduledTime={selectedSession?.start_time || "19:00"}
          onConfirm={handleBookingConfirm}
          isLoading={loadingBooking === selectedSession?.id}
        />

      <CancellationConfirmDialog
        open={cancellationDialogOpen}
        onOpenChange={setCancellationDialogOpen}
        course={selectedSession?.courses || {}}
        booking={selectedBooking || {}}
        onConfirm={handleCancellationConfirm}
        isLoading={loadingBooking === selectedBooking?.session_id}
      />

      <HowItWorksModal
        isOpen={showHowItWorksModal}
        onClose={() => setShowHowItWorksModal(false)}
      />

      <CourseParticipantsViewModal
        sessionId={selectedSessionForParticipants || ''}
        isOpen={selectedSessionForParticipants !== null}
        onClose={() => setSelectedSessionForParticipants(null)}
      />

      <WaitlistConfirmDialog
        open={waitlistDialogOpen}
        onOpenChange={setWaitlistDialogOpen}
        courseName={selectedSession?.courses?.name || ''}
        scheduledDate={selectedSession?.session_date || ''}
        scheduledTime={selectedSession?.start_time || ''}
        creditsRequired={selectedSession?.courses?.credits_required || 1}
        estimatedPosition={estimatedWaitlistPosition}
        onConfirm={handleWaitlistConfirm}
        isLoading={loadingBooking === selectedSession?.id}
      />
    </div>
  );
};