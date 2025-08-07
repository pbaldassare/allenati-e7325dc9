import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Trophy, Dumbbell } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const Dashboard = () => {
  const { courses, bookings, bookCourse, cancelBooking, getCourseById } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);

  // Get user's bookings for today's courses
  const userBookings = bookings.filter(b => b.userId === user?.id && b.status === 'confirmed');
  const upcomingCourses = courses.slice(0, 2); // Show next 2 courses

  const handleBooking = async (courseId: string, isBooked: boolean) => {
    if (!user) return;
    
    setLoadingBooking(courseId);
    try {
      if (isBooked) {
        const booking = userBookings.find(b => b.courseId === courseId);
        if (booking) {
          cancelBooking(booking.id);
          toast({
            title: "Prenotazione cancellata",
            description: "Hai cancellato la prenotazione con successo",
          });
        }
      } else {
        const courseData = getCourseById(courseId);
        await bookCourse(courseId, new Date().toISOString().split('T')[0], courseData?.schedule[0]?.time || '19:00');
        toast({
          title: "Prenotazione confermata",
          description: "Corso prenotato con successo!",
        });
      }
    } catch (error) {
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
    return userBookings.some(b => b.courseId === courseId);
  };
  return (
    <div className="pb-20 px-4 space-y-8">
      {/* Modern Header */}
      <div className="pt-8 pb-6">
        <h1 className="text-4xl font-bold gradient-text mb-2">Ciao, Marco! 👋</h1>
        <p className="text-muted-foreground text-lg font-medium">Benvenuto nella tua palestra</p>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-primary text-primary-foreground shadow-glow border-0 animate-float">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-10 w-10 animate-glow" />
              <div>
                <p className="text-3xl font-bold">12</p>
                <p className="text-sm opacity-90 font-medium">Classi questo mese</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary text-secondary-foreground shadow-glow border-0 animate-float" style={{animationDelay: '0.5s'}}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-10 w-10 animate-glow" />
              <div>
                <p className="text-3xl font-bold">3°</p>
                <p className="text-sm opacity-90 font-medium">Posizione classifica</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Status Abbonamento */}
      <Card className="shadow-glow bg-gradient-accent/5 border-accent/20 glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-xl">
            <span className="gradient-text font-bold">Abbonamento Premium</span>
            <Badge className="bg-gradient-success text-success-foreground font-semibold px-3 py-1">Attivo</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-xl font-bold">Piano Illimitato</p>
            <p className="text-base text-muted-foreground font-medium">Scade il 25 Marzo 2025</p>
            <div className="w-full bg-muted rounded-full h-3 mt-4 overflow-hidden">
              <div className="bg-gradient-primary h-3 rounded-full shadow-glow transition-smooth animate-glow" style={{width: '75%'}}></div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">23 giorni rimanenti</p>
          </div>
        </CardContent>
      </Card>

      {/* Modern Prossimi Corsi */}
      <Card className="shadow-glow glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <Calendar className="h-6 w-6 text-primary" />
            Prossimi Corsi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
{upcomingCourses.map((course, index) => {
            const courseIsBooked = isBooked(course.id);
            const isLoading = loadingBooking === course.id;
            
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
                      <span>{course.schedule[0]?.time || "N/A"}</span>
                      <Users className="h-4 w-4 ml-1" />
                      <span>{course.currentParticipants}/{course.maxParticipants}</span>
                    </div>
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
          })}
        </CardContent>
      </Card>
    </div>
  );
};