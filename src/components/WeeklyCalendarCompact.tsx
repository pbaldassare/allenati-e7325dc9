import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';

interface CourseSchedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course: {
    id: string;
    name: string;
    category_id: string;
    course_categories: {
      name: string;
      color_hex: string;
    };
  };
  booking_count: number;
}

interface WeeklyCalendarCompactProps {
  onDayClick?: (date: Date) => void;
  selectedDate?: Date;
}

const WeeklyCalendarCompact = ({ onDayClick, selectedDate }: WeeklyCalendarCompactProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [courseSchedules, setCourseSchedules] = useState<CourseSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { userGyms } = useGym();

  const getWeekDays = (date: Date) => {
    const week = [];
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    start.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDays = getWeekDays(currentWeek);
  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  useEffect(() => {
    const loadCourseSchedules = async () => {
      if (!user || userGyms.length === 0) return;

      try {
        setLoading(true);
        const userGymIds = userGyms.map(gym => gym.id);
        const { data: schedules } = await supabase
          .from('course_schedules')
          .select(`
            id,
            day_of_week,
            start_time,
            end_time,
            course:courses!inner (
              id,
              name,
              category_id,
              gym_id,
              course_categories (
                name,
                color_hex
              )
            )
          `)
          .in('course.gym_id', userGymIds)
          .eq('course.is_active', true)
          .eq('is_active', true);

        if (schedules) {
          // Add booking counts
          const schedulesWithCounts = await Promise.all(
            schedules.map(async (schedule) => {
              const { count } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('course_id', schedule.course.id)
                .neq('status', 'cancelled');

              return {
                ...schedule,
                booking_count: count || 0
              };
            })
          );

          setCourseSchedules(schedulesWithCounts);
        }
      } catch (error) {
        console.error('Errore nel caricamento degli schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourseSchedules();
  }, [user, userGyms]);

  const getCoursesForDay = (dayOfWeek: number) => {
    return courseSchedules.filter(schedule => schedule.day_of_week === dayOfWeek);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border-2 border-primary/20 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mx-auto mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border-2 border-primary/20 p-4 shadow-card">
      {/* Header con navigazione settimana */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateWeek('prev')}
          className="p-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <h3 className="font-space font-semibold text-lg">
            {formatWeekRange()}
          </h3>
          <p className="text-sm text-muted-foreground">
            {currentWeek.getFullYear()}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateWeek('next')}
          className="p-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Griglia giorni della settimana */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date, index) => {
          const dayOfWeek = index + 1; // Monday = 1, Sunday = 7
          const coursesForDay = getCoursesForDay(dayOfWeek === 7 ? 0 : dayOfWeek); // Sunday = 0 in our DB
          const adjustedDayOfWeek = dayOfWeek === 7 ? 0 : dayOfWeek;
          const actualCoursesForDay = getCoursesForDay(adjustedDayOfWeek);

          return (
            <div
              key={date.toISOString()}
              className={`
                p-2 rounded-xl text-center cursor-pointer transition-all duration-200 min-h-[70px] flex flex-col justify-center items-center
                ${isToday(date) ? 'bg-primary text-primary-foreground shadow-lg' : ''}
                ${isSelected(date) ? 'ring-2 ring-primary ring-offset-2' : ''}
                ${!isToday(date) && !isSelected(date) ? 'hover:bg-accent hover:text-accent-foreground hover:scale-105' : ''}
                ${actualCoursesForDay.length > 0 ? 'border border-primary/30' : ''}
              `}
              onClick={() => onDayClick?.(date)}
            >
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {dayNames[index]}
              </div>
              <div className={`text-lg font-bold ${isToday(date) ? 'text-primary-foreground' : ''}`}>
                {date.getDate()}
              </div>
              
              {actualCoursesForDay.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="text-xs mt-1 px-1 py-0 min-w-0 pointer-events-none"
                >
                  {actualCoursesForDay.length}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer con legenda */}
      <div className="mt-3 text-center">
        <p className="text-xs text-muted-foreground">
          I numeri indicano i corsi disponibili per giorno
        </p>
      </div>
    </div>
  );
};

export default WeeklyCalendarCompact;