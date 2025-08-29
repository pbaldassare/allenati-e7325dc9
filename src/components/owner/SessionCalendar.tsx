import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, startOfMonth, endOfMonth, addMonths, eachWeekOfInterval, isSameMonth } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CourseParticipantCount } from "@/components/CourseParticipantCount";
import { SessionManagementDrawer } from "./SessionManagementDrawer";

interface SessionData {
  id: string;
  course_id: string;
  courseName: string;
  course_description?: string;
  date: string;
  time: string;
  start_time: string;
  end_time: string;
  room: string;
  instructor: string;
  participants: number;
  maxParticipants: number;
  status: 'scheduled' | 'cancelled' | 'completed';
  credits: number;
}

type ViewMode = 'week' | 'month';

const SessionCalendar: React.FC = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  useEffect(() => {
    fetchSessions();
  }, [currentWeek, currentMonth, viewMode]);

  const fetchSessions = async () => {
    setLoading(true);
    
    try {
      // Get user's gym ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!membership) return;

      // Get date range based on view mode
      let startDate: Date, endDate: Date;
      
      if (viewMode === 'week') {
        startDate = startOfWeek(currentWeek, { weekStartsOn: 1 });
        endDate = endOfWeek(currentWeek, { weekStartsOn: 1 });
      } else {
        startDate = startOfMonth(currentMonth);
        endDate = endOfMonth(currentMonth);
      }

      const { data: sessionsData, error } = await supabase
        .from('course_sessions')
        .select(`
          *,
          courses!inner (
            name,
            description,
            gym_id,
            instructor_id,
            credits_required
          )
        `)
        .eq('courses.gym_id', membership.gym_id)
        .gte('session_date', format(startDate, 'yyyy-MM-dd'))
        .lte('session_date', format(endDate, 'yyyy-MM-dd'))
        .eq('status', 'scheduled')
        .order('session_date')
        .order('start_time');

      if (error) {
        console.error('Error fetching sessions:', error);
        return;
      }

      // Get booking counts for each session
      const sessionIds = sessionsData?.map(s => s.id) || [];
      
      const { data: bookingCounts } = await supabase
        .from('bookings')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('status', 'confirmed');

      // Count bookings per session
      const bookingCountMap = (bookingCounts || []).reduce((acc, booking) => {
        acc[booking.session_id] = (acc[booking.session_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Transform data
      const transformedSessions: SessionData[] = (sessionsData || []).map(session => ({
        id: session.id,
        course_id: session.course_id,
        courseName: session.courses.name,
        course_description: session.courses.description,
        date: session.session_date,
        time: `${session.start_time} - ${session.end_time}`,
        start_time: session.start_time,
        end_time: session.end_time,
        room: session.room_name || 'Non specificata',
        instructor: 'Non assegnato',
        participants: bookingCountMap[session.id] || 0,
        maxParticipants: session.max_participants,
        status: session.status as 'scheduled' | 'cancelled' | 'completed',
        credits: session.courses.credits_required
      }));

      setSessions(transformedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (participants: number, maxParticipants: number) => {
    const occupancyRate = maxParticipants > 0 ? participants / maxParticipants : 0;
    
    if (occupancyRate >= 0.9) return 'bg-destructive/20 border-destructive/30';
    if (occupancyRate >= 0.7) return 'bg-warning/20 border-warning/30';
    if (occupancyRate >= 0.4) return 'bg-primary/20 border-primary/30';
    return 'bg-success/20 border-success/30';
  };

  const getSessionsForDay = (day: Date) => {
    return sessions.filter(session => 
      format(new Date(session.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    ).sort((a, b) => a.time.localeCompare(b.time));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => addMonths(prev, direction === 'next' ? 1 : -1));
  };

  const getWeekRangeText = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    return `${format(weekStart, 'dd MMM', { locale: it })} - ${format(weekEnd, 'dd MMM yyyy', { locale: it })}`;
  };

  const getMonthText = () => {
    return format(currentMonth, 'MMMM yyyy', { locale: it });
  };

  // Month view helpers
  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      format(new Date(session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getDaySessionCount = (date: Date) => {
    return getSessionsForDate(date).length;
  };

  const getDayOccupancyColor = (date: Date) => {
    const daySessions = getSessionsForDate(date);
    if (daySessions.length === 0) return '';
    
    const totalParticipants = daySessions.reduce((sum, session) => sum + session.participants, 0);
    const totalCapacity = daySessions.reduce((sum, session) => sum + session.maxParticipants, 0);
    const occupancyRate = totalCapacity > 0 ? totalParticipants / totalCapacity : 0;

    if (occupancyRate >= 0.9) return 'bg-destructive/20 border-destructive/30';
    if (occupancyRate >= 0.7) return 'bg-warning/20 border-warning/30';
    if (occupancyRate >= 0.4) return 'bg-primary/20 border-primary/30';
    return 'bg-success/20 border-success/30';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center">Caricamento sessioni...</div>
      </Card>
    );
  }

  const renderWeekView = () => {
    const weekDays = eachDayOfInterval({
      start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
      end: endOfWeek(currentWeek, { weekStartsOn: 1 })
    });

    return (
      <div className="grid grid-cols-7 gap-1 md:gap-4 min-h-[600px]">
        {weekDays.map((day) => {
          const daySessions = getSessionsForDay(day);
          
          return (
            <div key={day.toISOString()} className="flex flex-col border border-border rounded-lg bg-card">
              <div className="p-1 md:p-2 border-b border-border bg-muted/50 sticky top-0">
                <h3 className="font-medium text-center text-xs md:text-sm">
                  {format(day, 'EEE dd', { locale: it })}
                </h3>
                {daySessions.length > 0 && (
                  <div className="text-xs text-center text-muted-foreground mt-1 hidden md:block">
                    {daySessions.length} sessioni
                  </div>
                )}
              </div>
              
              <div className="flex-1 p-1 md:p-2 overflow-y-auto">
                {daySessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2 md:py-4">
                    Nessuna sessione
                  </p>
                ) : (
                  <div className="space-y-1 md:space-y-2">
                    {daySessions.map((session) => (
                        <SessionManagementDrawer
                        key={session.id}
                        session={{
                          id: session.id,
                          course_id: session.course_id,
                          course_name: session.courseName,
                          course_description: session.course_description,
                          session_date: session.date,
                          start_time: session.start_time,
                          end_time: session.end_time,
                          room_name: session.room,
                          max_participants: session.maxParticipants,
                          available_spots: session.maxParticipants - session.participants,
                          participant_count: session.participants
                        }}
                        onSessionUpdate={fetchSessions}
                      >
                        <Card 
                          className={`p-1 md:p-2 cursor-pointer hover:shadow-md transition-shadow min-h-[32px] md:min-h-[70px] flex flex-col justify-between ${getOccupancyColor(session.participants, session.maxParticipants)}`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium line-clamp-2 leading-tight">{session.courseName}</div>
                            <div className="text-xs text-muted-foreground leading-tight">{session.time}</div>
                          </div>
                          <div className="mt-0.5">
                            <div className="text-xs text-muted-foreground">
                              {session.participants}/{session.maxParticipants}
                            </div>
                          </div>
                        </Card>
                      </SessionManagementDrawer>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const weeks = eachWeekOfInterval({
      start: calendarStart,
      end: calendarEnd
    }, { weekStartsOn: 1 });

    return (
      <div className="space-y-2">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        {weeks.map((weekStart) => {
          const weekDays = eachDayOfInterval({
            start: weekStart,
            end: endOfWeek(weekStart, { weekStartsOn: 1 })
          });
          
          return (
            <div key={weekStart.toISOString()} className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const daySessionCount = getDaySessionCount(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const daySessions = getSessionsForDate(day);
                
                return (
                  <Card 
                    key={day.toISOString()} 
                    className={cn(
                      "p-3 h-24 relative",
                      !isCurrentMonth && "opacity-50",
                      daySessionCount > 0 && getDayOccupancyColor(day)
                    )}
                  >
                    <div className="text-sm font-medium mb-1">
                      {format(day, 'd')}
                    </div>
                    
                    {daySessionCount > 0 && (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs h-4 px-1">
                          {daySessionCount} sessioni
                        </Badge>
                        {daySessions.slice(0, 2).map((session, idx) => (
                          <SessionManagementDrawer
                            key={session.id}
                            session={{
                              id: session.id,
                              course_id: session.course_id,
                              course_name: session.courseName,
                              course_description: session.course_description,
                              session_date: session.date,
                              start_time: session.start_time,
                              end_time: session.end_time,
                              room_name: session.room,
                              max_participants: session.maxParticipants,
                              available_spots: session.maxParticipants - session.participants,
                              participant_count: session.participants
                            }}
                            onSessionUpdate={fetchSessions}
                          >
                            <div className="text-xs truncate text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                              {session.courseName}
                            </div>
                          </SessionManagementDrawer>
                        ))}
                        {daySessionCount > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{daySessionCount - 2} altre
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => viewMode === 'week' ? navigateWeek('prev') : navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {viewMode === 'week' ? getWeekRangeText() : getMonthText()}
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => viewMode === 'week' ? navigateWeek('next') : navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Settimana
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Mese
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {viewMode === 'week' 
            ? 'Nessuna sessione programmata per questa settimana'
            : 'Nessuna sessione programmata per questo mese'
          }
        </div>
      ) : (
        viewMode === 'week' ? renderWeekView() : renderMonthView()
      )}
    </Card>
  );
};

export default SessionCalendar;