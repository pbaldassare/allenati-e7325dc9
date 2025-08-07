
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Dumbbell, 
  Zap, 
  Target, 
  Trophy, 
  Activity, 
  Heart, 
  Flame, 
  Shield,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";

interface Course {
  id: string;
  name: string;
  level: string;
  time: string;
  instructor: string;
  currentParticipants: number;
  maxParticipants: number;
  status: 'available' | 'booked' | 'full' | 'subscription-required';
  category: 'bjj' | 'mma' | 'boxing' | 'wrestling' | 'muay-thai' | 'yoga' | 'functional' | 'grappling';
  icon: any;
  gradient: string;
}

const courseIcons = {
  bjj: Shield,
  mma: Zap,
  boxing: Target,
  wrestling: Trophy,
  'muay-thai': Flame,
  yoga: Heart,
  functional: Activity,
  grappling: Dumbbell
};

const courseGradients = {
  bjj: "bg-gradient-to-br from-blue-500 to-blue-700",
  mma: "bg-gradient-to-br from-red-500 to-red-700",
  boxing: "bg-gradient-to-br from-yellow-500 to-orange-600",
  wrestling: "bg-gradient-to-br from-purple-500 to-purple-700",
  'muay-thai': "bg-gradient-to-br from-orange-500 to-red-600",
  yoga: "bg-gradient-to-br from-green-400 to-emerald-600",
  functional: "bg-gradient-to-br from-indigo-500 to-blue-600",
  grappling: "bg-gradient-to-br from-gray-600 to-gray-800"
};

const weekDays = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const fakeCourses: { [key: string]: Course[] } = {
  'Lunedì': [
    {
      id: '1',
      name: 'BJJ Principianti',
      level: 'Principianti',
      time: '19:00 - 20:15',
      instructor: 'Marco Rossi',
      currentParticipants: 8,
      maxParticipants: 12,
      status: 'available',
      category: 'bjj',
      icon: Shield,
      gradient: courseGradients.bjj
    },
    {
      id: '2',
      name: 'Functional Training',
      level: 'HIIT',
      time: '20:30 - 21:30',
      instructor: 'Sara Bianchi',
      currentParticipants: 10,
      maxParticipants: 15,
      status: 'booked',
      category: 'functional',
      icon: Activity,
      gradient: courseGradients.functional
    }
  ],
  'Martedì': [
    {
      id: '3',
      name: 'MMA Base',
      level: 'Intermedio',
      time: '18:00 - 19:30',
      instructor: 'Luca Verdi',
      currentParticipants: 12,
      maxParticipants: 12,
      status: 'full',
      category: 'mma',
      icon: Zap,
      gradient: courseGradients.mma
    },
    {
      id: '4',
      name: 'Yoga Hatha',
      level: 'Tutti i livelli',
      time: '10:00 - 11:00',
      instructor: 'Anna Gialli',
      currentParticipants: 5,
      maxParticipants: 15,
      status: 'available',
      category: 'yoga',
      icon: Heart,
      gradient: courseGradients.yoga
    }
  ],
  'Mercoledì': [
    {
      id: '5',
      name: 'Boxing Tecnica',
      level: 'Principianti',
      time: '19:00 - 20:00',
      instructor: 'Roberto Neri',
      currentParticipants: 6,
      maxParticipants: 10,
      status: 'subscription-required',
      category: 'boxing',
      icon: Target,
      gradient: courseGradients.boxing
    },
    {
      id: '6',
      name: 'BJJ Intermedio',
      level: 'Intermedio',
      time: '20:15 - 21:30',
      instructor: 'Marco Rossi',
      currentParticipants: 9,
      maxParticipants: 12,
      status: 'available',
      category: 'bjj',
      icon: Shield,
      gradient: courseGradients.bjj
    }
  ],
  'Giovedì': [
    {
      id: '7',
      name: 'Muay Thai',
      level: 'Avanzato',
      time: '19:30 - 21:00',
      instructor: 'Thai Master',
      currentParticipants: 8,
      maxParticipants: 10,
      status: 'booked',
      category: 'muay-thai',
      icon: Flame,
      gradient: courseGradients['muay-thai']
    }
  ],
  'Venerdì': [
    {
      id: '8',
      name: 'Wrestling',
      level: 'Competition',
      time: '18:00 - 19:30',
      instructor: 'Mike Johnson',
      currentParticipants: 7,
      maxParticipants: 8,
      status: 'available',
      category: 'wrestling',
      icon: Trophy,
      gradient: courseGradients.wrestling
    },
    {
      id: '9',
      name: 'Grappling No-Gi',
      level: 'Tutti i livelli',
      time: '20:00 - 21:15',
      instructor: 'Marco Rossi',
      currentParticipants: 11,
      maxParticipants: 15,
      status: 'available',
      category: 'grappling',
      icon: Dumbbell,
      gradient: courseGradients.grappling
    }
  ],
  'Sabato': [
    {
      id: '10',
      name: 'Yoga Vinyasa',
      level: 'Intermedio',
      time: '09:00 - 10:30',
      instructor: 'Anna Gialli',
      currentParticipants: 12,
      maxParticipants: 20,
      status: 'available',
      category: 'yoga',
      icon: Heart,
      gradient: courseGradients.yoga
    },
    {
      id: '11',
      name: 'MMA Sparring',
      level: 'Avanzato',
      time: '11:00 - 12:30',
      instructor: 'Luca Verdi',
      currentParticipants: 6,
      maxParticipants: 8,
      status: 'subscription-required',
      category: 'mma',
      icon: Zap,
      gradient: courseGradients.mma
    }
  ],
  'Domenica': [
    {
      id: '12',
      name: 'Open Mat BJJ',
      level: 'Libero',
      time: '10:00 - 12:00',
      instructor: 'Tutti gli istruttori',
      currentParticipants: 15,
      maxParticipants: 20,
      status: 'available',
      category: 'bjj',
      icon: Shield,
      gradient: courseGradients.bjj
    }
  ]
};

export const CourseCalendar = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);
  
  const { courses, bookings, bookCourse, cancelBooking } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get user's bookings
  const userBookings = bookings.filter(b => b.userId === user?.id && b.status === 'confirmed');

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
        const courseData = courses.find(c => c.id === courseId);
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

  // Group courses by day (using context data now)
  const coursesByDay = courses.reduce((acc, course) => {
    // Get day from schedule
    const dayNumber = course.schedule[0]?.dayOfWeek ?? 1; // Default to Monday
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const day = dayNames[dayNumber] || 'Lunedì';
    if (!acc[day]) acc[day] = [];
    acc[day].push(course);
    return acc;
  }, {} as { [key: string]: any[] });

  const getStatusBadge = (status: Course['status']) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-success text-success-foreground">Disponibile</Badge>;
      case 'booked':
        return <Badge className="bg-primary text-primary-foreground">Prenotato</Badge>;
      case 'full':
        return <Badge className="bg-destructive text-destructive-foreground">Completo</Badge>;
      case 'subscription-required':
        return <Badge className="bg-warning text-warning-foreground">Abbonamento</Badge>;
    }
  };

  const getActionButton = (course: any) => {
    const courseIsBooked = isBooked(course.id);
    const isLoading = loadingBooking === course.id;
    const isFull = course.currentParticipants >= course.maxParticipants;
    
    if (isLoading) {
      return <Button size="sm" disabled>...</Button>;
    }
    
    if (courseIsBooked) {
      return (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleBooking(course.id, true)}
        >
          Disdici
        </Button>
      );
    }
    
    if (isFull) {
      return <Button size="sm" variant="outline" disabled>Completo</Button>;
    }
    
    return (
      <Button 
        size="sm" 
        className="bg-success text-success-foreground hover:bg-success/90"
        onClick={() => handleBooking(course.id, false)}
      >
        Prenota
      </Button>
    );
  };

  return (
    <div className="pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Calendario Corsi</h1>
            <p className="text-muted-foreground mt-1">Prenota i tuoi corsi preferiti</p>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtri
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">Settimana corrente</h2>
          <p className="text-sm text-muted-foreground">15 - 21 Gennaio 2025</p>
        </div>
        <Button variant="outline" size="sm">
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
                  const IconComponent = course.icon;
                  return (
                    <Card key={course.id} className="shadow-card hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Icon */}
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-primary">
                            <Dumbbell className="h-6 w-6 text-white" />
                          </div>
                          
                          {/* Course Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground">{course.name}</h4>
                              <Badge variant="outline" className="text-xs">{course.level || 'Generale'}</Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{course.schedule[0]?.time || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{course.currentParticipants}/{course.maxParticipants}</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1">
                              Istruttore: {course.instructor}
                            </p>
                          </div>
                          
                          {/* Status and Action */}
                          <div className="flex flex-col items-end gap-2">
                            {isBooked(course.id) ? (
                              <Badge className="bg-primary text-primary-foreground">Prenotato</Badge>
                            ) : course.currentParticipants >= course.maxParticipants ? (
                              <Badge className="bg-destructive text-destructive-foreground">Completo</Badge>
                            ) : (
                              <Badge className="bg-success text-success-foreground">Disponibile</Badge>
                            )}
                            {getActionButton(course)}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{width: `${(course.currentParticipants / course.maxParticipants) * 100}%`}}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {course.maxParticipants - course.currentParticipants} posti disponibili
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Nessun corso programmato</p>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
