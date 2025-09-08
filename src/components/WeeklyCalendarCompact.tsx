import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';

interface CourseSession {
  id: string;
  course_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  available_spots: number;
  max_participants: number;
  courses: {
    name: string;
    is_active: boolean;
    gym_id: string;
  };
}

interface WeeklyCalendarCompactProps {
  onDayClick?: (date: Date) => void;
  selectedDate?: Date;
}

const WeeklyCalendarCompact = ({ onDayClick, selectedDate }: WeeklyCalendarCompactProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [courseSessions, setCourseSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { selectedGym } = useGym();

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
    const loadCourseSessions = async () => {
      if (!user || !selectedGym?.id) return;

      try {
        setLoading(true);
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday as first day
        const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
        
        const { data, error } = await supabase
          .from('course_sessions')
          .select(`
            id,
            course_id,
            session_date,
            start_time,
            end_time,
            available_spots,
            max_participants,
            courses!inner (
              name,
              is_active,
              gym_id
            )
          `)
          .eq('courses.gym_id', selectedGym.id)
          .eq('courses.is_active', true)
          .eq('status', 'scheduled')
          .gte('session_date', format(weekStart, 'yyyy-MM-dd'))
          .lte('session_date', format(weekEnd, 'yyyy-MM-dd'))
          .order('session_date', { ascending: true });

        if (error) throw error;

        setCourseSessions(data || []);
      } catch (error) {
        console.error('Error loading course sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourseSessions();
  }, [user, selectedGym, currentWeek]);

  const getSessionsForDay = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return courseSessions.filter(session => session.session_date === dateString);
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
    <div className="space-y-3">
      {/* Header con navigazione settimana */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateWeek('prev')}
          className="p-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center">
          <h3 className="font-semibold text-base">
            {formatWeekRange()}
          </h3>
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

      {/* Griglia giorni della settimana - senza bordi */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date, index) => {
          const sessionsForDay = getSessionsForDay(date);

          return (
            <div
              key={date.toISOString()}
              className="p-2 text-center h-[80px] flex flex-col justify-between items-center"
            >
              {/* Nome giorno - sempre in alto */}
              <div className="text-xs text-muted-foreground">
                {dayNames[index]}
              </div>
              
              {/* Numero giorno - sempre al centro */}
              <div className={`text-base font-medium ${isToday(date) ? 'text-primary' : isSelected(date) ? 'text-primary' : 'text-foreground'}`}>
                {date.getDate()}
              </div>
              
              {/* Area badge - sempre in basso */}
              <div className="h-6 flex items-center justify-center">
                {sessionsForDay.length > 0 ? (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs px-2 py-1 min-w-0 cursor-pointer transition-colors ${
                      isSelected(date) 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                    }`}
                    onClick={() => onDayClick?.(date)}
                  >
                    {sessionsForDay.length}
                  </Badge>
                ) : (
                  <div className="h-6"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyCalendarCompact;