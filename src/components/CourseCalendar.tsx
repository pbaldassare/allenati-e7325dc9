import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCourses } from "@/hooks/useCourses";
import { useBookings } from "@/hooks/useBookings";
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
  Swords
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Map database icon names to Lucide React components
const iconMap = {
  'shield': Shield,
  'target': Target,
  'swords': Swords,
  'trophy': Trophy,
  'flame': Flame,
  'heart': Heart,
  'activity': Activity,
  'dumbbell': Dumbbell,
  'zap': Zap
};

// Get icon component from database icon name
const getIconComponent = (iconName: string | null) => {
  if (!iconName) return Dumbbell;
  return iconMap[iconName as keyof typeof iconMap] || Dumbbell;
};

// Keep category-based mapping for backward compatibility
const courseIcons = {
  'Brazilian Jiu-Jitsu': Shield,
  'BJJ': Shield,
  'MMA': Swords,
  'Boxing': Target,
  'Wrestling': Trophy,
  'Kickboxing': Flame,
  'Muay Thai': Flame,
  'Yoga': Heart,
  'Functional': Activity,
  'Grappling': Dumbbell
};

const weekDays = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

// Filter options
const categoryFilters = ['Tutti', 'Brazilian Jiu-Jitsu', 'MMA', 'Boxing', 'Wrestling', 'Kickboxing', 'Muay Thai', 'Yoga', 'Functional', 'Grappling'];
const levelFilters = ['Tutti', 'Beginner', 'Intermediate', 'Advanced'];
const availabilityFilters = ['Tutti', 'Disponibili', 'Pieni', 'Prenotati'];

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
  
  const { courses, loading: coursesLoading, bookCourse, cancelBooking } = useCourses();
  const { bookings } = useBookings();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get user's confirmed bookings
  const userBookings = bookings.filter(b => b.status === 'confirmed');

  const handleBooking = async (courseId: string, isBooked: boolean) => {
    if (!user) return;
    
    setLoadingBooking(courseId);
    try {
      if (isBooked) {
        await cancelBooking(courseId);
        toast({
          title: "Prenotazione cancellata",
          description: "Hai cancellato la prenotazione con successo",
        });
      } else {
        const courseData = courses.find(c => c.id === courseId);
        const schedule = courseData?.schedules[0];
        if (schedule) {
          await bookCourse(courseId, new Date().toISOString().split('T')[0], schedule.start_time);
          toast({
            title: "Prenotazione confermata", 
            description: "Corso prenotato con successo!",
          });
        }
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
    return userBookings.some(b => b.course_id === courseId);
  };

  // Filter courses based on selected filters
  const filteredCourses = courses.filter(course => {
    const categoryMatch = selectedCategory === 'Tutti' || course.category_name === selectedCategory;
    const levelText = course.difficulty_level === 1 ? 'Beginner' : 
                      course.difficulty_level === 2 ? 'Intermediate' : 'Advanced';
    const levelMatch = selectedLevel === 'Tutti' || levelText === selectedLevel;
    
    let availabilityMatch = true;
    if (selectedAvailability === 'Disponibili') {
      availabilityMatch = (course.current_participants || 0) < course.max_participants && !isBooked(course.id);
    } else if (selectedAvailability === 'Pieni') {
      availabilityMatch = (course.current_participants || 0) >= course.max_participants;
    } else if (selectedAvailability === 'Prenotati') {
      availabilityMatch = isBooked(course.id);
    }
    
    return categoryMatch && levelMatch && availabilityMatch;
  });

  // Group filtered courses by day
  const coursesByDay = filteredCourses.reduce((acc, course) => {
    const dayNumber = course.schedules[0]?.day_of_week ?? 1;
    const day = weekDays[dayNumber] || 'Lunedì';
    if (!acc[day]) acc[day] = [];
    acc[day].push(course);
    return acc;
  }, {} as { [key: string]: any[] });

  const getActionButton = (course: any) => {
    const courseIsBooked = isBooked(course.id);
    const isLoading = loadingBooking === course.id;
    const isFull = (course.current_participants || 0) >= course.max_participants;
    
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

  const clearFilters = () => {
    setSelectedCategory('Tutti');
    setSelectedLevel('Tutti');
    setSelectedAvailability('Tutti');
  };

  const hasActiveFilters = selectedCategory !== 'Tutti' || selectedLevel !== 'Tutti' || selectedAvailability !== 'Tutti';

  const weekInfo = getWeekDates(currentWeek);

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
              {categoryFilters.map((category) => (
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
                  {level}
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
                {selectedLevel}
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
                   const IconComponent = getIconComponent(course.category_icon) || courseIcons[course.category_name as keyof typeof courseIcons] || Dumbbell;
                  const levelText = course.difficulty_level === 1 ? 'Beginner' : 
                                    course.difficulty_level === 2 ? 'Intermediate' : 'Advanced';
                  return (
                    <Card key={course.id} className="shadow-card hover:shadow-lg transition-all duration-300">
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
                              <Badge variant="outline" className="text-xs">{levelText}</Badge>
                              <Badge variant="outline" className="text-xs">{course.category_name}</Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{course.schedules[0]?.start_time?.slice(0, 5)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{course.current_participants || 0}/{course.max_participants}</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mt-1">
                              Istruttore: {course.instructor_name}
                            </p>
                          </div>
                          
                          {/* Status and Action */}
                          <div className="flex flex-col items-end gap-2">
                            {isBooked(course.id) ? (
                              <Badge className="bg-primary text-primary-foreground">Prenotato</Badge>
                            ) : (course.current_participants || 0) >= course.max_participants ? (
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
                              style={{width: `${((course.current_participants || 0) / course.max_participants) * 100}%`}}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {course.max_participants - (course.current_participants || 0)} posti disponibili
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