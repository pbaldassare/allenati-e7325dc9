import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { it } from "date-fns/locale";

interface SessionData {
  id: string;
  course_id: string;
  course_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_name: string | null;
  max_participants: number;
  participant_count: number;
  instructor_name: string;
  status: string;
}

const SessionCalendar: React.FC = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekDays = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });

  useEffect(() => {
    fetchSessions();
  }, [currentWeek]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      // Get user's gym_id
      const { data: gymId } = await (supabase as any)
        .rpc('get_user_gym_id', { _user_id: (await supabase.auth.getUser()).data.user?.id });
      
      if (!gymId) return;

      const weekEnd = addDays(weekStart, 6);

      // Fetch sessions with participant counts
      const { data: sessionsData, error } = await supabase
        .from("course_sessions")
        .select(`
          id,
          course_id,
          session_date,
          start_time,
          end_time,
          room_name,
          max_participants,
          status,
          courses!inner(
            name,
            gym_id,
            instructor_id,
            instructors(
              user_id,
              profiles(first_name, last_name)
            )
          )
        `)
        .eq('courses.gym_id', gymId)
        .gte('session_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('session_date', format(weekEnd, 'yyyy-MM-dd'))
        .eq('status', 'scheduled')
        .order('session_date')
        .order('start_time');

      if (error) {
        console.error('Error fetching sessions:', error);
        return;
      }

      // Get participant counts for each session
      const sessionIds = sessionsData?.map(s => s.id) || [];
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("session_id")
        .in('session_id', sessionIds)
        .eq('status', 'confirmed');

      // Count participants per session
      const participantCounts = bookingsData?.reduce((acc, booking) => {
        acc[booking.session_id] = (acc[booking.session_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Transform data
      const transformedSessions: SessionData[] = sessionsData?.map(session => ({
        id: session.id,
        course_id: session.course_id,
        course_name: (session.courses as any).name,
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        room_name: session.room_name,
        max_participants: session.max_participants,
        participant_count: participantCounts[session.id] || 0,
        instructor_name: `${(session.courses as any).instructors?.profiles?.first_name || ''} ${(session.courses as any).instructors?.profiles?.last_name || ''}`.trim(),
        status: session.status
      })) || [];

      setSessions(transformedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 80) return "bg-green-500/20 text-green-700 border-green-300";
    if (percentage >= 40) return "bg-yellow-500/20 text-yellow-700 border-yellow-300";
    if (percentage >= 10) return "bg-orange-500/20 text-orange-700 border-orange-300";
    return "bg-red-500/20 text-red-700 border-red-300";
  };

  const getSessionsForDay = (dayIndex: number) => {
    const targetDate = addDays(weekStart, dayIndex);
    return sessions.filter(session => 
      isSameDay(new Date(session.session_date), targetDate)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const getWeekRangeText = () => {
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, 'dd MMM', { locale: it })} - ${format(weekEnd, 'dd MMM yyyy', { locale: it })}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendario Sessioni</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Calendario Sessioni</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {getWeekRangeText()}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dayDate = addDays(weekStart, index);
            const daySessions = getSessionsForDay(index);
            
            return (
              <div key={index} className="space-y-2">
                <div className="text-center">
                  <div className="font-medium text-sm">{day}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(dayDate, 'dd/MM')}
                  </div>
                </div>
                
                <div className="space-y-2 min-h-[100px]">
                  {daySessions.map((session) => (
                    <Card key={session.id} className={`p-3 ${getOccupancyColor(session.participant_count, session.max_participants)}`}>
                      <div className="space-y-1">
                        <div className="font-medium text-xs truncate">
                          {session.course_name}
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {session.start_time.slice(0, 5)}-{session.end_time.slice(0, 5)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              {session.participant_count}/{session.max_participants}
                            </span>
                          </div>
                          
                          {session.room_name && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="text-xs truncate max-w-[50px]">
                                {session.room_name}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {session.instructor_name && (
                          <div className="text-xs text-muted-foreground truncate">
                            {session.instructor_name}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                  
                  {daySessions.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Nessuna sessione
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {sessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna sessione programmata per questa settimana
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionCalendar;