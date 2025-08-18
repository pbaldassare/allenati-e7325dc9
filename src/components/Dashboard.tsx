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

export const Dashboard = () => {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [instructorProfiles, setInstructorProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      if (!user || !selectedGym) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Load user's bookings first
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'confirmed');

        if (bookingsError) throw bookingsError;

        // Load booked courses with detailed info
        const bookedCourseIds = bookingsData?.map(b => b.course_id) || [];
        
        let bookedCoursesData = [];
        if (bookedCourseIds.length > 0) {
          const { data, error } = await supabase
            .from('courses')
            .select(`
              *,
              course_categories(name, color_hex, icon_name),
              instructors(user_id),
              course_schedules(*, gym_rooms(name, color)),
              gyms(name)
            `)
            .in('id', bookedCourseIds)
            .eq('is_active', true);
          
          if (!error) bookedCoursesData = data || [];
        }

        // Load available courses (not booked by user)
        const { data: availableCoursesData, error: availableError } = await supabase
          .from('courses')
          .select(`
            *,
            course_categories(name, color_hex, icon_name),
            instructors(user_id),
            course_schedules(*, gym_rooms(name, color)),
            gyms(name)
          `)
          .eq('gym_id', selectedGym.id)
          .eq('is_active', true)
          .not('id', 'in', `(${bookedCourseIds.join(',') || 'null'})`)
          .order('created_at', { ascending: true })
          .limit(6);

        if (availableError) throw availableError;

        // Get instructor profiles for all courses
        const allCourses = [...bookedCoursesData, ...(availableCoursesData || [])];
        const instructorUserIds = [...new Set(allCourses.map(c => c.instructors?.user_id).filter(Boolean))];
        
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

        // Get booking counts for each course to show progress
        const courseIds = allCourses.map(c => c.id);
        if (courseIds.length > 0) {
          const { data: bookingCounts } = await supabase
            .from('bookings')
            .select('course_id')
            .in('course_id', courseIds)
            .eq('status', 'confirmed');

          // Add booking counts to courses
          allCourses.forEach(course => {
            const count = bookingCounts?.filter(b => b.course_id === course.id).length || 0;
            course.current_bookings = count;
          });
        }

        setCourses(bookedCoursesData || []);
        setAvailableCourses(availableCoursesData || []);
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

  const getInstructorName = (course: any) => {
    const profile = instructorProfiles[course.instructors?.user_id];
    if (!profile) return 'Istruttore';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Istruttore';
  };

  const getInstructorAvatar = (course: any) => {
    const profile = instructorProfiles[course.instructors?.user_id];
    return profile?.profile_picture_url || null;
  };

  const getCourseProgress = (course: any) => {
    const current = course.current_bookings || 0;
    const max = course.max_participants || 1;
    return (current / max) * 100;
  };

  const filteredAvailableCourses = availableCourses.filter(course => {
    if (activeFilter === 'all') return true;
    return course.course_categories?.name.toLowerCase().includes(activeFilter.toLowerCase());
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
    <div className="pb-20 px-4 space-y-6">
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

      {/* I Tuoi Corsi Prenotati */}
      {courses.length > 0 && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg font-bold">
              <Calendar className="h-5 w-5 text-success" />
              I Tuoi Corsi Prenotati
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {courses.map((course) => {
              const instructorName = getInstructorName(course);
              const instructorAvatar = getInstructorAvatar(course);
              const schedule = course.course_schedules?.[0];
              const progress = getCourseProgress(course);
              const isLoading = loadingBooking === course.id;
              
              return (
                <div key={course.id} className="bg-success/10 border border-success/20 rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 border-2 border-success/30">
                      <AvatarImage src={instructorAvatar} alt={instructorName} />
                      <AvatarFallback className="bg-success/20 text-success font-bold">
                        {instructorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-base text-foreground">{course.name}</h3>
                          <p className="text-sm text-muted-foreground">{instructorName}</p>
                        </div>
                        <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                          Prenotato
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{schedule?.start_time || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{schedule?.gym_rooms?.name || 'Sala'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {course.current_bookings || 0}/{course.max_participants} posti
                          </span>
                          <Progress value={progress} className="w-16 h-2" />
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const booking = bookings.find(b => b.course_id === course.id);
                            openCancellationDialog(course, booking);
                          }}
                          disabled={isLoading}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          {isLoading ? "..." : "Cancella"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Integrated Weekly Calendar */}
      <WeeklyCalendarCompact />

      {/* Corsi Disponibili - Moved Higher for Better Visibility */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <Zap className="h-6 w-6 text-primary" />
              Corsi Disponibili
            </CardTitle>
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
          <CardDescription className="text-sm font-medium">
            Scopri i corsi disponibili nella tua palestra
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredAvailableCourses.length > 0 ? (
            filteredAvailableCourses.slice(0, 8).map((course) => {
              const instructorName = getInstructorName(course);
              const instructorAvatar = getInstructorAvatar(course);
              const schedule = course.course_schedules?.[0];
              const progress = getCourseProgress(course);
              const isLoading = loadingBooking === course.id;
              const categoryColor = course.course_categories?.color_hex || '#3B82F6';
              const spotsLeft = course.max_participants - (course.current_bookings || 0);
              const isAlmostFull = spotsLeft <= 3 && spotsLeft > 0;
              const isFull = spotsLeft <= 0;
              
              return (
                <div key={course.id} className="group bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-4 hover:shadow-xl hover:scale-[1.02] hover:border-primary/40 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="w-14 h-14 border-2 border-primary/30 group-hover:border-primary/50 transition-colors">
                        <AvatarImage src={instructorAvatar} alt={instructorName} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                          {instructorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {course.course_categories && (
                        <div 
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background"
                          style={{ backgroundColor: categoryColor }}
                        />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                            {course.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">{instructorName}</p>
                          {course.course_categories && (
                            <Badge variant="secondary" className="text-xs mt-1" style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}>
                              {course.course_categories.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {progress >= 100 ? (
                            <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">
                              Completo
                            </Badge>
                          ) : progress >= 85 ? (
                            <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                              Ultimi posti
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              Disponibile
                            </Badge>
                          )}
                          {course.credits_required > 1 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3" />
                              <span>{course.credits_required} crediti</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{schedule?.start_time || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{schedule?.gym_rooms?.name || 'Sala'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{course.current_bookings || 0}/{course.max_participants}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          <span>{course.duration_minutes}min</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Progress value={progress} className="flex-1 h-2 mr-3" />
                        
                        {progress < 100 && (
                          <Button
                            onClick={() => openBookingDialog(course)}
                            disabled={isLoading}
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all"
                          >
                            {isLoading ? "..." : "Prenota Ora"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-bold text-xl mb-3 bg-gradient-primary bg-clip-text text-transparent">
                Nessun corso disponibile
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Al momento non ci sono corsi disponibili nella tua palestra. Controlla più tardi o esplora altre opzioni.
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

      {/* Modern Stats Cards - Moved after courses for better hierarchy */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{bookings.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Prenotati</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{availableCourses.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Disponibili</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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