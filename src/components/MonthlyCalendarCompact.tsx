import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { cn } from '@/lib/utils';

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

interface MonthlyCalendarCompactProps {
  onDayClick?: (date: Date) => void;
  selectedDate?: Date | null;
}

export const MonthlyCalendarCompact: React.FC<MonthlyCalendarCompactProps> = ({ 
  onDayClick, 
  selectedDate 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [courseSessions, setCourseSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { userGyms } = useGym();

  useEffect(() => {
    if (user && userGyms.length > 0) {
      loadCourseSessions();
    }
  }, [user, userGyms, currentDate]);

  const loadCourseSessions = async () => {
    try {
      const userGymIds = userGyms.map(gym => gym.id);
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
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
        .in('courses.gym_id', userGymIds)
        .eq('courses.is_active', true)
        .eq('status', 'scheduled')
        .gte('session_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('session_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('session_date', { ascending: true });

      if (error) throw error;

      setCourseSessions(data || []);
    } catch (error) {
      console.error('Error loading course sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDay = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return courseSessions.filter(session => session.session_date === dateString);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Split days into two rows of 7 days each, showing up to 14 days
  const firstRowDays = monthDays.slice(0, 14);
  const secondRowDays = monthDays.slice(14, 28);

  const renderDayCell = (day: Date) => {
    const sessionsForDay = getSessionsForDay(day);
    const hasSessions = sessionsForDay.length > 0;
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    
    return (
      <div
        key={day.toISOString()}
        className={cn(
          "flex flex-col items-center justify-center p-1 text-xs min-h-[2.5rem] border rounded-md transition-colors cursor-pointer",
          hasSessions ? "bg-primary/10 border-primary/20 hover:bg-primary/20" : "border-border hover:bg-muted/50",
          isToday(day) ? "ring-2 ring-primary" : "",
          isSelected ? "bg-primary/20 border-primary" : ""
        )}
        onClick={() => onDayClick?.(day)}
      >
        <div className={cn(
          "font-medium",
          isToday(day) ? "text-primary font-bold" : "text-foreground"
        )}>
          {format(day, 'd')}
        </div>
        {hasSessions && (
          <Badge 
            variant="secondary" 
            className="text-[0.6rem] px-1 py-0 mt-0.5 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDayClick?.(day);
            }}
          >
            {sessionsForDay.length}
          </Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-muted rounded w-32"></div>
          <div className="flex gap-1">
            <div className="h-8 w-8 bg-muted rounded"></div>
            <div className="h-8 w-8 bg-muted rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-base">
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </h4>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['D', 'L', 'M', 'M', 'G', 'V', 'S'].map((day, index) => (
            <div key={index} className="text-xs font-medium text-muted-foreground text-center py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* First two weeks */}
        <div className="grid grid-cols-7 gap-1">
          {firstRowDays.map(renderDayCell)}
        </div>
        
        {/* Second two weeks */}
        {secondRowDays.length > 0 && (
          <div className="grid grid-cols-7 gap-1">
            {secondRowDays.map(renderDayCell)}
          </div>
        )}
      </div>
      
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Clicca sui giorni con sessioni per filtrarle
        </p>
      </div>
    </div>
  );
};