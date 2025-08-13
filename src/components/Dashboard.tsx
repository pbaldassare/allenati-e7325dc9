import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Trophy, Dumbbell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          setLoading(false);
          return;
        }

        // Load upcoming courses for user's gym (limit to 2)
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            *,
            course_categories(name, color_hex, icon_name),
            instructors(profiles(first_name, last_name)),
            course_schedules(*)
          `)
          .eq('gym_id', userGym)
          .eq('is_active', true)
          .limit(2);

        if (coursesError) throw coursesError;

        // Load user's bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'confirmed');

        if (bookingsError) throw bookingsError;

        setCourses(coursesData || []);
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
  }, [user, toast]);

  const handleBooking = async (courseId: string, isBooked: boolean) => {
    if (!user) return;
    
    setLoadingBooking(courseId);
    try {
      if (isBooked) {
        // Cancel booking
        const booking = bookings.find(b => b.course_id === courseId);
        if (booking) {
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('id', booking.id);

          if (error) throw error;

          setBookings(prev => prev.filter(b => b.id !== booking.id));
          toast({
            title: "Prenotazione cancellata",
            description: "Hai cancellato la prenotazione con successo",
          });
        }
      } else {
        // Create booking - use today's date and a default time
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            user_id: user.id,
            course_id: courseId,
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
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'operazione",
        variant: "destructive",
      });
    } finally {
      setLoadingBooking(null);
    }
  };

  const isBooked = (courseId: string) => {
    return bookings.some(b => b.course_id === courseId);
  };

  if (loading) {
    return (
      <div className="pb-20 px-4 space-y-8">
        <div className="pt-8 pb-6">
          <h1 className="text-4xl font-bold gradient-text mb-2">Caricamento... ⏳</h1>
          <p className="text-muted-foreground text-lg font-medium">Caricamento dei tuoi dati</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 space-y-8">
      {/* Modern Header */}
      <div className="pt-8 pb-6">
        <h1 className="text-4xl font-bold gradient-text mb-2">Ciao! 👋</h1>
        <p className="text-muted-foreground text-lg font-medium">Benvenuto nella tua palestra</p>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-primary text-primary-foreground shadow-glow border-0 animate-float">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-10 w-10 animate-glow" />
              <div>
                <p className="text-3xl font-bold">{bookings.length}</p>
                <p className="text-sm opacity-90 font-medium">Prenotazioni attive</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary text-secondary-foreground shadow-glow border-0 animate-float" style={{animationDelay: '0.5s'}}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-10 w-10 animate-glow" />
              <div>
                <p className="text-3xl font-bold">{courses.length}</p>
                <p className="text-sm opacity-90 font-medium">Corsi disponibili</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Status Abbonamento */}
      <Card className="shadow-glow bg-gradient-accent/5 border-accent/20 glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-xl">
            <span className="gradient-text font-bold">Abbonamento</span>
            <Badge className="bg-gradient-success text-success-foreground font-semibold px-3 py-1">Attivo</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-xl font-bold">Piano Base</p>
            <p className="text-base text-muted-foreground font-medium">Accesso ai corsi della tua palestra</p>
            <div className="w-full bg-muted rounded-full h-3 mt-4 overflow-hidden">
              <div className="bg-gradient-primary h-3 rounded-full shadow-glow transition-smooth animate-glow" style={{width: '100%'}}></div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Abbonamento attivo</p>
          </div>
        </CardContent>
      </Card>

      {/* Modern Prossimi Corsi */}
      <Card className="shadow-glow glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <Calendar className="h-6 w-6 text-primary" />
            Corsi Disponibili
          </CardTitle>
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
                <div key={course.id} className={`flex items-center justify-between p-4 rounded-2xl border hover:scale-[1.02] transition-bounce ${
                  index === 0 
                    ? 'bg-gradient-primary/10 border-primary/20' 
                    : 'bg-gradient-secondary/10 border-secondary/20'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-glow ${
                      index === 0 ? 'bg-gradient-primary' : 'bg-gradient-secondary'
                    }`}>
                      <Dumbbell className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{course.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                        <Clock className="h-4 w-4" />
                        <span>{schedule?.start_time || "N/A"}</span>
                        <Users className="h-4 w-4 ml-1" />
                        <span>{course.max_participants} posti</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Istruttore: {instructorName}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant={courseIsBooked ? "success" : "outline"} 
                    className="font-semibold" 
                    onClick={() => handleBooking(course.id, courseIsBooked)}
                    disabled={isLoading}
                  >
                    {isLoading ? "..." : (courseIsBooked ? "Prenotato" : "Prenota")}
                  </Button>
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
    </div>
  );
};