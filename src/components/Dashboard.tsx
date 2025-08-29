import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, User, Users, Trophy, Star, HelpCircle, Building2, ArrowRight, MapPin, Zap, Activity, Filter, Infinity, Coins, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookingConfirmDialog } from '@/components/dialogs/BookingConfirmDialog';
import { CancellationConfirmDialog } from '@/components/dialogs/CancellationConfirmDialog';
import { useGym } from '@/contexts/GymContext';
import { HowItWorksModal } from './modals/HowItWorksModal';
import WeeklyCalendarCompact from './WeeklyCalendarCompact';
import { MonthlyCalendarCompact } from './MonthlyCalendarCompact';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CourseParticipantCount } from './CourseParticipantCount';
import { useSessionBookings } from '@/hooks/useSessionBookings';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export const Dashboard = () => {
  const { user } = useAuth();
  const { userGyms, selectedGym } = useGym();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { bookings, isSessionBooked, cancelSessionBooking, loading: bookingsLoading } = useSessionBookings();
  const [availableSessions, setAvailableSessions] = useState([]);
  const [instructorProfiles, setInstructorProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [userCredits, setUserCredits] = useState<number>(0);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

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
    } catch (error) {
      console.error('Errore nel caricamento dati crediti/abbonamento:', error);
    } finally {
      setCreditsLoading(false);
    }
  };

  // Load available sessions from Supabase
  useEffect(() => {
    const loadAvailableSessions = async () => {
      if (!user || userGyms.length === 0) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const userGymIds = userGyms.map(gym => gym.id);
      const today = new Date().toISOString().split('T')[0];
      
      try {
        // Load all future sessions from user's gyms with instructor names via foreign key
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('course_sessions')
          .select(`
            *,
            courses!inner(
              id,
              name,
              description,
              credits_required,
              difficulty_level,
              instructor_id,
              gym_id,
              course_categories(name, color_hex, icon_name),
              instructors!courses_instructor_id_fkey(first_name, last_name),
              gyms(name)
            )
          `)
          .in('courses.gym_id', userGymIds)
          .eq('courses.is_active', true)
          .eq('status', 'scheduled')
          .gte('session_date', today)
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (sessionsError) throw sessionsError;

        setAvailableSessions(sessionsData || []);
        
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
  }, [user, userGyms, selectedGym, toast]);

  const openBookingDialog = (session: any) => {
    setSelectedSession(session);
    setBookingDialogOpen(true);
  };

  const openCancellationDialog = (session: any, booking: any) => {
    setSelectedSession(session);
    setSelectedBooking(booking);
    setCancellationDialogOpen(true);
  };

  const handleBookingConfirm = async () => {
    if (!user || !selectedSession) return;
    
    setLoadingBooking(selectedSession.id);
    try {
      // Check if user has enough credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_credits')
        .eq('user_id', user.id)
        .single();

      const currentCredits = profile?.current_credits || 0;
      const creditsRequired = selectedSession.courses?.credits_required || 1;

      if (currentCredits < creditsRequired) {
        throw new Error('Crediti insufficienti per prenotare questa sessione');
      }

      // Check if session has available spots
      if (selectedSession.available_spots <= 0) {
        throw new Error('Nessun posto disponibile per questa sessione');
      }

      // Create booking
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          course_id: selectedSession.course_id,
          session_id: selectedSession.id,
          scheduled_date: selectedSession.session_date,
          scheduled_time: selectedSession.start_time,
          status: 'confirmed',
          credits_used: creditsRequired
        })
        .select()
        .single();

      if (error) throw error;

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
              bookingId: booking.id,
              userEmail: profile.email,
              userName: `${profile.first_name} ${profile.last_name}`,
              courseName: selectedSession.courses?.name || 'Corso',
              scheduledDate: selectedSession.session_date,
              scheduledTime: selectedSession.start_time,
              gymName: gym.name,
              gymAddress: `${gym.address}, ${gym.city}`,
              instructorName: `${instructor.first_name} ${instructor.last_name}`,
              creditsUsed: creditsRequired,
            }
          });
        }
      } catch (emailError) {
        console.error('Error sending booking confirmation email:', emailError);
        // Don't fail the booking if email fails
      }

      // Check for unlimited subscription first
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

      // Deduct credits only if no unlimited subscription
      if (!hasUnlimitedAccess) {
        // Get user's gym ID for credit deduction
        const gymId = selectedGym?.id;
        if (gymId) {
          const { deductCredits } = await import('@/lib/creditRefundHelpers');
          const result = await deductCredits(
            user.id,
            gymId,
            creditsRequired,
            `Prenotazione sessione: ${selectedSession.courses?.name}`,
            booking.id
          );
          
          if (!result.success) {
            throw new Error(result.message);
          }
        }
      }

      toast({
        title: "Prenotazione confermata",
        description: `Sessione prenotata per ${new Date(selectedSession.session_date).toLocaleDateString('it-IT')} alle ${selectedSession.start_time}`,
      });
      setBookingDialogOpen(false);
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

  const isSessionBookedByUser = (sessionId: string) => {
    return isSessionBooked(sessionId);
  };

  const getInstructorName = (session: any) => {
    const instructor = session.courses?.instructors;
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
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
          Ciao{user?.first_name ? `, ${user.first_name}` : ''}! 👋
        </h1>
        <p className="text-muted-foreground text-base md:text-lg font-medium">
          Benvenuto nella tua palestra
        </p>
        
        <Button
          onClick={() => setShowHowItWorksModal(true)}
          variant="outline"
          size="sm"
          className="mt-3 text-primary border-primary/20 hover:bg-primary/5"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Come funziona l'app
        </Button>
      </div>

      {/* Summary Stats - Moved to top */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-card cursor-pointer" onClick={() => navigate('/i-miei-corsi')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
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
            <p className="text-xs text-muted-foreground">Prossime Sessioni</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all duration-300 border-2 shadow-card ${
            creditsLoading 
              ? 'bg-gradient-to-br from-muted/10 to-muted/5 border-muted/20' 
              : userSubscription?.plan?.unlimited_access
                ? 'bg-gradient-to-br from-green-500/10 to-green-400/5 border-green-500/20 hover:border-green-500/40'
                : userCredits > 0
                  ? 'bg-gradient-to-br from-blue-500/10 to-blue-400/5 border-blue-500/20 hover:border-blue-500/40'
                  : 'bg-gradient-to-br from-orange-500/10 to-orange-400/5 border-orange-500/20 hover:border-orange-500/40'
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
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <Infinity className="w-6 h-6" />
                  <span className="text-2xl font-bold">Illimitato</span>
                </div>
                <p className="text-xs text-muted-foreground">Abbonamento Attivo</p>
              </>
            ) : userCredits > 0 ? (
              <>
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <Coins className="w-6 h-6" />
                  <span className="text-2xl font-bold">{userCredits}</span>
                </div>
                <p className="text-xs text-muted-foreground">Crediti Disponibili</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center space-x-2 text-orange-600">
                  <ShoppingCart className="w-6 h-6" />
                  <span className="text-lg font-bold">Acquista</span>
                </div>
                <p className="text-xs text-muted-foreground">Crediti o Abbonamento</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar Section with Toggle */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Calendario</h3>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value: 'weekly' | 'monthly') => value && setViewMode(value)}
              className="bg-muted/50 p-1 rounded-lg"
            >
              <ToggleGroupItem value="weekly" className="text-xs">
                Settimana
              </ToggleGroupItem>
              <ToggleGroupItem value="monthly" className="text-xs">
                Mese
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          {viewMode === 'weekly' ? (
            <WeeklyCalendarCompact onDayClick={handleDayClick} selectedDate={selectedDate} />
          ) : (
            <MonthlyCalendarCompact onDayClick={handleDayClick} selectedDate={selectedDate} />
          )}
        </CardContent>
      </Card>


      {/* Sessioni Disponibili - Session-based Booking */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
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
              
              return (
                 <Card key={session.id} className={cn(
                    "group hover:shadow-md transition-all duration-200 border-primary/20 hover:border-primary/40",
                    isAlreadyBooked && "bg-primary/5 border-primary/40"
                  )}>
                    <CardContent className="p-4 sm:p-3">
                      {/* Mobile: Vertical Layout, Desktop: Horizontal Layout */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Header section with avatar and main info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="w-12 h-12 sm:w-10 sm:h-10 border-2 border-primary/30 flex-shrink-0">
                             <AvatarImage src={instructorAvatar} alt="Istruttore" />
                             <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm sm:text-xs">
                               I
                             </AvatarFallback>
                          </Avatar>
                           
                           <div className="flex-1 min-w-0">
                             <h3 className="font-semibold text-base sm:text-sm text-foreground">{session.courses?.name}</h3>
                             <p className="text-sm sm:text-xs text-muted-foreground">{instructorName}</p>
                           </div>
                        </div>
                        
                         {/* Details section - Mobile: Below header, Desktop: Same row */}
                         <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 text-sm sm:text-xs text-muted-foreground">
                           <div className="flex items-center gap-1">
                             <Clock className="h-4 w-4 sm:h-3 sm:w-3" />
                             <span>{session.start_time}</span>
                           </div>
                           <CourseParticipantCount
                             sessionId={session.id}
                             maxParticipants={session.max_participants}
                             className="text-sm sm:text-xs"
                           />
                         </div>
                        
                        {/* Action button - Mobile: Full width, Desktop: Compact */}
                        <div className="flex justify-center sm:justify-end mt-2 sm:mt-0">
                          {isAlreadyBooked ? (
                            <Badge variant="secondary" className="text-sm sm:text-xs px-4 sm:px-2 py-2 sm:py-1">
                              Prenotato
                            </Badge>
                          ) : (
                            <Button
                              onClick={() => openBookingDialog(session)}
                              disabled={isLoading || isFull}
                              size="sm"
                              className="w-full sm:w-auto text-sm sm:text-xs h-9 sm:h-7 px-6 sm:px-2 flex-shrink-0 font-medium"
                            >
                              {isLoading ? "..." : isFull ? "Pieno" : "Prenota"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
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
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
                  
                  // Don't show buttons for past dates
                  if (selectedDateStr && selectedDateStr < today) {
                    return null;
                  }
                  
                  return (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => navigate('/gyms')}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Esplora Palestre
                      </Button>
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="border-primary/20 text-primary hover:bg-primary/5"
                      >
                        Aggiorna
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
         </CardContent>
       </Card>


        <BookingConfirmDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          course={selectedSession?.courses || {}}
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
    </div>
  );
};