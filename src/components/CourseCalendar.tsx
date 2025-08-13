import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  Filter,
  X,
  Flower
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const courseIcons = {
  'Functional Training': Activity,
  'Cardio': Heart,
  'Strength Training': Trophy,
  'Pilates': Flower,
  'CrossFit': Zap,
  'BJJ': Shield,
  'MMA': Zap,
  'Boxing': Target,
  'Wrestling': Trophy,
  'Muay Thai': Flame,
  'Yoga': Heart,
  'Functional': Activity,
  'Grappling': Dumbbell
};

const weekDays = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

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

export const CourseCalendar = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');
  const [selectedLevel, setSelectedLevel] = useState<string>('Tutti');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('Tutti');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [loadingBooking, setLoadingBooking] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['Tutti']);
  const [loading, setLoading] = useState(true);
  
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
            instructors(user_id),
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

  const handleBooking = async (courseId: string, isBooked: boolean, scheduledDate: string, scheduledTime: string) => {
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
        // Create booking
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            user_id: user.id,
            course_id: courseId,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
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
      return (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleBooking(course.id, true, new Date().toISOString().split('T')[0], course.schedule?.start_time || '19:00')}
        >
          Disdici
        </Button>
      );
    }
    
    return (
      <Button 
        size="sm" 
        className="bg-success text-success-foreground hover:bg-success/90"
        onClick={() => handleBooking(course.id, false, new Date().toISOString().split('T')[0], course.schedule?.start_time || '19:00')}
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
              <DropdownMenuLabel className="flex items-center justify-between">
                Filtri
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground">Categoria</DropdownMenuLabel>
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? 'bg-accent' : ''}
                >
                  {category}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground">Livello</DropdownMenuLabel>
              {levelFilters.map((level) => (
                <DropdownMenuItem
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={selectedLevel === level ? 'bg-accent' : ''}
                >
                  {level === 'Tutti' ? level : `Livello ${level}`}
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground">Disponibilità</DropdownMenuLabel>
              {availabilityFilters.map((availability) => (
                <DropdownMenuItem
                  key={availability}
                  onClick={() => setSelectedAvailability(availability)}
                  className={selectedAvailability === availability ? 'bg-accent' : ''}
                >
                  {availability}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtri attivi:</span>
            {selectedCategory !== 'Tutti' && (
              <Badge variant="outline" className="gap-1">
                {selectedCategory}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-3 w-3 p-0" 
                  onClick={() => setSelectedCategory('Tutti')}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}
            {selectedLevel !== 'Tutti' && (
              <Badge variant="outline" className="gap-1">
                Livello {selectedLevel}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-3 w-3 p-0" 
                  onClick={() => setSelectedLevel('Tutti')}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}
            {selectedAvailability !== 'Tutti' && (
              <Badge variant="outline" className="gap-1">
                {selectedAvailability}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-3 w-3 p-0" 
                  onClick={() => setSelectedAvailability('Tutti')}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}
          </div>
        )}
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
                  const IconComponent = courseIcons[course.course_categories?.name as keyof typeof courseIcons] || Dumbbell;
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
    </div>
  );
};