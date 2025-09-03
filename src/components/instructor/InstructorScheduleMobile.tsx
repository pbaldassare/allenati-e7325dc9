import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay } from "date-fns";
import { it } from "date-fns/locale/it";
import { cn } from "@/lib/utils";
import { SessionManagementDrawer } from "@/components/owner/SessionManagementDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructorGym } from "@/contexts/InstructorGymContext";

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

const InstructorScheduleMobile: React.FC = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const { user } = useAuth();
  const { selectedGymId, hasOwnerPrivilegesForGym } = useInstructorGym();

  console.log('=== INSTRUCTOR SCHEDULE MOBILE ===');
  console.log('User:', user?.id);
  console.log('Selected gym:', selectedGymId);
  console.log('Has owner privileges for gym:', selectedGymId ? hasOwnerPrivilegesForGym(selectedGymId) : false);
  console.log('Current date:', format(currentDate, 'yyyy-MM-dd'));

  useEffect(() => {
    fetchSessions();
  }, [currentDate, user, selectedGymId]);

  const fetchSessions = async () => {
    console.log('🔄 fetchSessions called');
    setLoading(true);
    setError(null);
    
    try {
      if (!user) {
        console.log('❌ No user found');
        setSessions([]);
        setLoading(false);
        return;
      }

      if (!selectedGymId) {
        console.log('❌ No selected gym found');
        setSessions([]);
        setLoading(false);
        return;
      }

      const hasOwnerPrivileges = hasOwnerPrivilegesForGym(selectedGymId);
      console.log('Fetching sessions for user:', user.id, 'hasOwnerPrivileges:', hasOwnerPrivileges);

      let courseIds: string[] = [];

      if (hasOwnerPrivileges) {
        // Super instructor - get all courses from selected gym
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id')
          .eq('gym_id', selectedGymId)
          .eq('is_active', true);

        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
          setSessions([]);
          setLoading(false);
          return;
        }

        courseIds = courses?.map(c => c.id) || [];
        console.log('Found courses for gym:', courseIds.length);
      } else {
        // Regular instructor - get instructor ID for selected gym
        const { data: instructorId } = await supabase
          .rpc('get_instructor_id_for_gym', { 
            _user_id: user.id, 
            _gym_id: selectedGymId 
          });

        if (!instructorId) {
          console.log('No instructor record found for this gym');
          setSessions([]);
          setLoading(false);
          return;
        }

        console.log('Found instructor:', instructorId);
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id')
          .eq('instructor_id', instructorId)
          .eq('gym_id', selectedGymId)
          .eq('is_active', true);

        if (coursesError) {
          console.error('Error fetching instructor courses:', coursesError);
          setSessions([]);
          setLoading(false);
          return;
        }

        courseIds = courses?.map(c => c.id) || [];
        console.log('Found instructor courses:', courseIds.length);
      }

      if (courseIds.length === 0) {
        console.log('No courses found, setting empty sessions');
        setSessions([]);
        setLoading(false);
        return;
      }

      // Now fetch sessions for these courses
      const { data: sessionsData, error } = await supabase
        .from('course_sessions')
        .select(`
          *,
          courses!inner (
            name,
            description,
            credits_required
          )
        `)
        .in('course_id', courseIds)
        .eq('session_date', format(currentDate, 'yyyy-MM-dd'))
        .eq('status', 'scheduled')
        .order('start_time');

      console.log('Sessions query result:', { sessionsData, error });

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
      console.error('❌ Error fetching sessions:', error);
      setError(`Errore nel caricamento: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
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
          <div className="text-center space-y-2">
            <div>🔄 Caricamento calendario mobile...</div>
            <div className="text-xs text-muted-foreground">
              User: {user?.id} | Gym: {selectedGymId?.slice(0,8)}... | Privileges: {selectedGymId && hasOwnerPrivilegesForGym(selectedGymId) ? 'Owner' : 'Regular'}
            </div>
          </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-destructive">❌ {error}</div>
          <Button onClick={fetchSessions} variant="outline" size="sm">
            Riprova
          </Button>
          <div className="text-xs text-muted-foreground">
            Debug: User {user?.id} | Privileges: {selectedGymId && hasOwnerPrivilegesForGym(selectedGymId) ? 'Owner' : 'Regular'}
          </div>
        </div>
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
          <div className="text-xs text-muted-foreground mt-2">
            🔍 {selectedGymId && hasOwnerPrivilegesForGym(selectedGymId) ? 'Super Istruttore' : 'Istruttore'} | {user?.id?.slice(0,8)}... | Gym: {selectedGymId?.slice(0,8)}...
          </div>
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
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {session.time}
                      </div>
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
                      className="text-xs flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
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

export default InstructorScheduleMobile;