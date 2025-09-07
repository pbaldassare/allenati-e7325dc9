import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Search, Users, UserPlus, Clock, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorCourses } from '@/hooks/useInstructorCourses';
import { useInstructorGym } from '@/contexts/InstructorGymContext';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_credits: number;
}

interface CourseSession {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_name: string;
  max_participants: number;
  available_spots: number;
}

export const InstructorManualEnrollment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { courses } = useInstructorCourses();
  const { selectedGymId } = useInstructorGym();

  // Search users in the gym
  const searchUsers = async () => {
    if (!searchTerm.trim() || !selectedGymId) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      // Only search users who are members of the selected gym
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id, 
          first_name, 
          last_name, 
          email, 
          current_credits,
          user_gym_memberships!inner(gym_id, status)
        `)
        .eq('user_gym_memberships.gym_id', selectedGymId)
        .eq('user_gym_memberships.status', 'active')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      const mappedUsers = data?.map(profile => ({
        id: profile.user_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        current_credits: profile.current_credits || 0,
      })) || [];

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Errore nella ricerca utenti"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load course sessions for the selected gym
  const loadSessions = async () => {
    if (!selectedCourse || !selectedGymId) {
      setSessions([]);
      return;
    }

    try {
      // Only load sessions for courses in the selected gym
      const { data, error } = await supabase
        .from('course_sessions')
        .select(`
          *,
          courses!inner(gym_id)
        `)
        .eq('course_id', selectedCourse)
        .eq('courses.gym_id', selectedGymId)
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(20);

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Errore nel caricamento delle sessioni"
      });
    }
  };

  // Manual enrollment
  const enrollUser = async (sessionId: string, userId: string) => {
    setEnrolling(sessionId);
    try {
      const { data, error } = await supabase.rpc('manual_enroll_user', {
        _user_id: userId,
        _session_id: sessionId,
        _enrolled_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Utente iscritto con successo!"
      });
      
      // Reload sessions to update available spots
      await loadSessions();
      
      // Clear selection
      setSelectedUser(null);
      
    } catch (error: any) {
      console.error('Error enrolling user:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nell'iscrizione"
      });
    } finally {
      setEnrolling(null);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [selectedCourse]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim() && selectedGymId) {
        searchUsers();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedGymId]);

  const selectedCourseName = courses.find(c => c.id === selectedCourse)?.name || '';
  const selectedCourseCredits = courses.find(c => c.id === selectedCourse)?.credits_required || 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Iscrivi Nuovo Partecipante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Course Selection */}
          <div className="space-y-2">
            <Label>Seleziona Corso</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli un corso..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name} ({course.credits_required} crediti)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User Search */}
          {selectedCourse && (
            <div className="space-y-2">
              <Label>Cerca Utente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome, cognome o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {/* Search Results */}
          {loading && selectedCourse && (
            <div className="text-center py-4 text-muted-foreground">
              Ricerca in corso...
            </div>
          )}

          {users.length > 0 && selectedCourse && (
            <div className="space-y-2">
              <Label>Risultati Ricerca</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={user.current_credits >= selectedCourseCredits ? "default" : "destructive"}
                        >
                          {user.current_credits} crediti
                        </Badge>
                        {user.current_credits < selectedCourseCredits && (
                          <Badge variant="outline" className="text-destructive">
                            Crediti insufficienti
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected User Info */}
          {selectedUser && selectedCourse && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      Utente Selezionato: {selectedUser.first_name} {selectedUser.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Corso: {selectedCourseName} ({selectedCourseCredits} crediti richiesti)
                    </p>
                  </div>
                  <Badge variant={selectedUser.current_credits >= selectedCourseCredits ? "default" : "destructive"}>
                    {selectedUser.current_credits} crediti disponibili
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Course Sessions */}
      {selectedUser && selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sessioni Disponibili - {selectedCourseName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessuna sessione programmata per questo corso
                </p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex justify-between items-center p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {format(new Date(session.session_date), 'EEEE dd MMMM yyyy', { locale: it })}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {session.start_time} - {session.end_time}
                        </span>
                        {session.room_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {session.room_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {session.available_spots} / {session.max_participants} posti
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => enrollUser(session.id, selectedUser.id)}
                      disabled={
                        session.available_spots <= 0 || 
                        enrolling === session.id || 
                        selectedUser.current_credits < selectedCourseCredits
                      }
                      size="sm"
                    >
                      {enrolling === session.id ? 'Iscrivendo...' : 'Iscrivi'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};