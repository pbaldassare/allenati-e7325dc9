import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, User, Users, Trophy, Star, HelpCircle, Building2, ArrowRight, MapPin, Zap, Activity, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookingConfirmDialog } from '@/components/dialogs/BookingConfirmDialog';
import { CancellationConfirmDialog } from '@/components/dialogs/CancellationConfirmDialog';
import { useGym } from '@/contexts/GymContext';
import { HowItWorksModal } from './modals/HowItWorksModal';
import WeeklyCalendarCompact from './WeeklyCalendarCompact';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CourseParticipantCount } from './CourseParticipantCount';
import { useSessionBookings } from '@/hooks/useSessionBookings';

export const Dashboard = () => {
  const { user } = useAuth();
  const { userGyms } = useGym();
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
        // Load all future sessions from user's gyms
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('course_sessions')
          .select(`
            *,
            courses!inner(
              *,
              course_categories(name, color_hex, icon_name),
              instructors(id, user_id, is_active),
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

        // Get instructor profiles
        const instructorUserIds = [...new Set(sessionsData?.map(s => s.courses?.instructors?.user_id).filter(Boolean))];
        
        if (instructorUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, profile_picture_url')
            .in('user_id', instructorUserIds);

          if (!profilesError && profilesData) {
            const profilesMap: Record<string, any> = {};
            profilesData.forEach(profile => {
              profilesMap[profile.user_id] = profile;
            });
            setInstructorProfiles(profilesMap);
          }
        }

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
  }, [user, userGyms, toast]);

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
      const { data, error } = await supabase
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

      // Deduct credits
      await supabase
        .from('credits_transactions')
        .insert({
          user_id: user.id,
          amount: -creditsRequired,
          balance_after: currentCredits - creditsRequired,
          transaction_type: 'booking',
          description: `Prenotazione sessione: ${selectedSession.courses?.name}`,
          reference_id: data.id
        });

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
    const profile = instructorProfiles[session.courses?.instructors?.user_id];
    if (!profile) return 'Istruttore';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Istruttore';
  };

  const getInstructorAvatar = (session: any) => {
    const profile = instructorProfiles[session.courses?.instructors?.user_id];
    return profile?.profile_picture_url || null;
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
      const sessionDate = new Date(session.session_date);
      return sessionDate.toDateString() === selectedDate.toDateString();
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
              {bookings.length}
            </div>
            <p className="text-xs text-muted-foreground">Sessioni Prenotate</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-secondary">{filteredAvailableSessions.length}</div>
            <p className="text-xs text-muted-foreground">Sessioni Disponibili</p>
          </CardContent>
        </Card>
      </div>

      {/* Integrated Weekly Calendar */}
      <WeeklyCalendarCompact onDayClick={handleDayClick} selectedDate={selectedDate} />


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
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/gyms')}
                className="flex items-center gap-2 text-primary border-primary/20 hover:bg-primary/5 shadow-sm"
              >
                <ArrowRight className="h-4 w-4" />
                Esplora Tutti
              </Button>
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
          {filteredAvailableSessions.length > 0 ? (
            filteredAvailableSessions.slice(0, 12).map((session) => {
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
                   <CardContent className="p-3">
                     <div className="flex items-center gap-3">
                       <Avatar className="w-10 h-10 border-2 border-primary/30 flex-shrink-0">
                          <AvatarImage src={instructorAvatar} alt="Istruttore" />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                            I
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-foreground">{session.courses?.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(session.session_date).toLocaleDateString('it-IT')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{session.start_time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{spotsLeft} posti</span>
                            </div>
                          </div>
                        </div>
                        
                        {isAlreadyBooked ? (
                          <Badge variant="secondary" className="text-xs">
                            Prenotato
                          </Badge>
                        ) : (
                          <Button
                            onClick={() => openBookingDialog(session)}
                            disabled={isLoading || isFull}
                            size="sm"
                            className="text-xs h-7 px-2 flex-shrink-0"
                          >
                            {isLoading ? "..." : isFull ? "Pieno" : "Prenota"}
                          </Button>
                        )}
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
                  Al momento non ci sono sessioni disponibili nelle tue palestre. Controlla più tardi o esplora altre opzioni.
                </p>
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