import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Users, Trophy, Star, HelpCircle, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookingConfirmDialog } from '@/components/dialogs/BookingConfirmDialog';
import { CancellationConfirmDialog } from '@/components/dialogs/CancellationConfirmDialog';
import { useGym } from '@/contexts/GymContext';
import { HowItWorksModal } from './modals/HowItWorksModal';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      if (!user || !selectedGym) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Load enrolled courses and nearest upcoming courses (max 3)
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            *,
            course_categories(name, color_hex, icon_name),
            instructors(user_id),
            course_schedules(*, gym_rooms(name)),
            gyms(name),
            bookings!inner(user_id, status)
          `)
          .eq('gym_id', selectedGym.id)
          .eq('is_active', true)
          .or(`bookings.user_id.eq.${user.id}.and.bookings.status.eq.confirmed,bookings.is.null`)
          .order('created_at', { ascending: false })
          .limit(3);

        // Also get upcoming available courses if we need more
        const { data: availableCoursesData, error: availableError } = await supabase
          .from('courses')
          .select(`
            *,
            course_categories(name, color_hex, icon_name),
            instructors(user_id),
            course_schedules(*, gym_rooms(name)),
            gyms(name)
          `)
          .eq('gym_id', selectedGym.id)
          .eq('is_active', true)
          .not('id', 'in', `(${coursesData?.map(c => c.id).join(',') || 'null'})`)
          .order('created_at', { ascending: true })
          .limit(3);

        // Combine and limit to 3 total
        const allCourses = [...(coursesData || []), ...(availableCoursesData || [])].slice(0, 3);

        if (coursesError || availableError) throw coursesError || availableError;

        // Load user's bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'confirmed');

        if (bookingsError) throw bookingsError;

        setCourses(allCourses || []);
        setBookings(bookingsData || []);
        
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
  }, [user, selectedGym, toast]);

  const openBookingDialog = (course: any) => {
    setSelectedCourse(course);
    setBookingDialogOpen(true);
  };

  const openCancellationDialog = (course: any, booking: any) => {
    setSelectedCourse(course);
    setSelectedBooking(booking);
    setCancellationDialogOpen(true);
  };

  const handleBookingConfirm = async () => {
    if (!user || !selectedCourse) return;
    
    setLoadingBooking(selectedCourse.id);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          course_id: selectedCourse.id,
          scheduled_date: new Date().toISOString().split('T')[0],
          scheduled_time: '19:00',
          status: 'confirmed'
        })
        .select()
        .single();

      if (error) throw error;

      setBookings(prev => [...prev, data]);
      toast({
        title: "Prenotazione confermata",
        description: "Corso prenotato con successo!",
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
      setSelectedCourse(null);
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

  if (loading) {
    return (
      <div className="pb-20 px-4 space-y-8">
        <div className="pt-8 pb-6">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">Caricamento... ⏳</h1>
          <p className="text-muted-foreground text-lg font-medium">Caricamento dei tuoi dati</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 space-y-8">
      {/* Modern Header */}
      <div className="pt-6 pb-4">
        <h1 className="text-2xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">Ciao{user?.first_name ? `, ${user.first_name}` : ''}! 👋</h1>
        <p className="text-muted-foreground text-base md:text-lg font-medium">Benvenuto nella tua palestra</p>
        
        <Button
          onClick={() => setShowHowItWorksModal(true)}
          variant="outline"
          size="sm"
          className="mt-3 text-primary border-primary/20 hover:bg-primary/5"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Come funziona l'app Allenati
        </Button>
      </div>


      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg border-0 p-3 md:p-0">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <Trophy className="h-6 w-6 md:h-10 md:w-10" />
              <div>
                <p className="text-xl md:text-3xl font-bold">{bookings.length}</p>
                <p className="text-xs md:text-sm opacity-90 font-medium">Prenotazioni attive</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success to-success/80 text-success-foreground shadow-lg border-0 p-3 md:p-0">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <Users className="h-6 w-6 md:h-10 md:w-10" />
              <div>
                <p className="text-xl md:text-3xl font-bold">{courses.length}</p>
                <p className="text-xs md:text-sm opacity-90 font-medium">I tuoi corsi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* I Tuoi Corsi */}
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <Calendar className="h-6 w-6 text-primary" />
              I Tuoi Corsi
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/gyms')}
              className="flex items-center gap-2"
            >
              Tutti i Corsi
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {courses.length > 0 ? (
            courses.map((course, index) => {
              const courseIsBooked = isBooked(course.id);
              const isLoading = loadingBooking === course.id;
              const instructorName = course.instructors?.profiles ? 
                `${course.instructors.profiles.first_name} ${course.instructors.profiles.last_name}` : 
                'Istruttore';
              const schedule = course.course_schedules?.[0];
              
              return (
                <div key={course.id} className={`flex items-center justify-between p-4 rounded-2xl border hover:scale-[1.02] transition-all duration-300 ${
                  index === 0 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'bg-success/10 border-success/20'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                      index === 0 ? 'bg-gradient-to-br from-primary to-primary/80' : 'bg-gradient-to-br from-success to-success/80'
                    }`}>
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{course.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-1">
                        <Building2 className="h-4 w-4" />
                        <span>{course.gyms?.name || 'Palestra'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                        <Clock className="h-4 w-4" />
                        <span>{schedule?.start_time || "N/A"}</span>
                        <Users className="h-4 w-4 ml-1" />
                        <span>{course.max_participants} posti</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Istruttore: {instructorName}</p>
                    </div>
                  </div>
                  
                  {courseIsBooked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const booking = bookings.find(b => b.course_id === course.id);
                        openCancellationDialog(course, booking);
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? "..." : "Prenotato"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => openBookingDialog(course)}
                      disabled={isLoading}
                    >
                      {isLoading ? "..." : "Prenota"}
                    </Button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nessun corso disponibile al momento</p>
            </div>
          )}
        </CardContent>
      </Card>


      <BookingConfirmDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        course={selectedCourse || {}}
        scheduledDate={new Date().toISOString().split('T')[0]}
        scheduledTime="19:00"
        onConfirm={handleBookingConfirm}
        isLoading={loadingBooking === selectedCourse?.id}
      />

      <CancellationConfirmDialog
        open={cancellationDialogOpen}
        onOpenChange={setCancellationDialogOpen}
        course={selectedCourse || {}}
        booking={selectedBooking || {}}
        onConfirm={handleCancellationConfirm}
        isLoading={loadingBooking === selectedBooking?.course_id}
      />

      <HowItWorksModal
        isOpen={showHowItWorksModal}
        onClose={() => setShowHowItWorksModal(false)}
      />
    </div>
  );
};