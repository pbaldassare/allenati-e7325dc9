import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay } from "date-fns";
import { it } from "date-fns/locale/it";
import { cn } from "@/lib/utils";
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

const SessionCalendarMobile: React.FC = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchSessions();
  }, [currentDate]);

  const fetchSessions = async () => {
    setLoading(true);
    
    try {
      // Get user's gym ID (for gym owners)
      const { data: { user } } = await supabase.auth.getUser();
      console.log('SessionCalendarMobile - User:', user);
      
      if (!user) {
        console.log('SessionCalendarMobile - No user found');
        setSessions([]);
        setLoading(false);
        return;
      }

      // First try to get gym from user_gym_memberships, then from ownership
      let gymId = null;
      
      const { data: membership } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (membership) {
        gymId = membership.gym_id;
      } else {
        // Check if user is a gym owner
        const { data: ownerGym } = await supabase
          .from('gyms')
          .select('id')
          .eq('owner_email', user.email)
          .maybeSingle();
        
        if (ownerGym) {
          gymId = ownerGym.id;
        }
      }

      if (!gymId) {
        console.log('SessionCalendarMobile - No gym ID found');
        setSessions([]);
        setLoading(false);
        return;
      }

      const dayStart = startOfDay(currentDate);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

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
        .eq('courses.gym_id', gymId)
        .eq('session_date', format(dayStart, 'yyyy-MM-dd'))
        .eq('status', 'scheduled')
        .order('start_time');

      if (error) {
        console.error('Error fetching sessions:', error);
        setSessions([]);
        setLoading(false);
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
        time: `${session.start_time.slice(0, 5)} - ${session.end_time.slice(0, 5)}`,
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
      setSessions([]);
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

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
  };

  const getCurrentDateText = () => {
    const today = startOfDay(new Date());
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);

    if (format(currentDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Oggi';
    } else if (format(currentDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ieri';
    } else if (format(currentDate, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
      return 'Domani';
    }
    
    return format(currentDate, 'EEEE dd MMMM yyyy', { locale: it });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center">Caricamento sessioni...</div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigateDay('prev')}
          className="h-10 w-10 p-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center">
          <h2 className="text-lg font-semibold flex items-center gap-2 justify-center">
            <Calendar className="h-5 w-5" />
            {getCurrentDateText()}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {sessions.length} {sessions.length === 1 ? 'sessione' : 'sessioni'} programmate
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigateDay('next')}
          className="h-10 w-10 p-0"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Nessuna sessione oggi</p>
          <p className="text-sm">Usa i pulsanti per navigare tra i giorni</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
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
                className={cn(
                  "p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4",
                  getOccupancyColor(session.participants, session.maxParticipants)
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 truncate">
                      {session.courseName}
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        🕐 {session.time}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        📍 {session.room}
                      </p>
                      {session.course_description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                          {session.course_description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Badge 
                      variant={
                        session.participants >= session.maxParticipants 
                          ? "destructive" 
                          : session.participants >= session.maxParticipants * 0.8 
                            ? "secondary" 
                            : "default"
                      }
                      className="text-xs"
                    >
                      {session.participants}/{session.maxParticipants}
                    </Badge>
                    
                    <div className="text-xs text-muted-foreground text-right">
                      {session.credits} {session.credits === 1 ? 'credito' : 'crediti'}
                    </div>
                    
                    <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-300",
                          session.participants >= session.maxParticipants * 0.9 
                            ? "bg-destructive" 
                            : session.participants >= session.maxParticipants * 0.7 
                              ? "bg-warning" 
                              : "bg-primary"
                        )}
                        style={{ 
                          width: `${Math.min((session.participants / session.maxParticipants) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </SessionManagementDrawer>
          ))}
        </div>
      )}
    </Card>
  );
};

export default SessionCalendarMobile;