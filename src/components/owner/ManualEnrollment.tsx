import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Users, UserPlus, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface ManualEnrollmentProps {
  courseId: string;
  courseName: string;
}

export const ManualEnrollment: React.FC<ManualEnrollmentProps> = ({
  courseId,
  courseName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  // Search users in the gym
  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      // Get gym credits for each user
      const mappedUsers = await Promise.all(
        (data || []).map(async (profile) => {
          // Get gym-specific credits (this would need gym context)
          const { data: gymCredits } = await supabase
            .from('gym_credits')
            .select('credits')
            .eq('user_id', profile.user_id)
            .maybeSingle();
          
          return {
            id: profile.user_id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || '',
            current_credits: gymCredits?.credits || 0,
          };
        })
      );

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Errore nella ricerca utenti');
    } finally {
      setLoading(false);
    }
  };

  // Load course sessions
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(20);

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Errore nel caricamento delle sessioni');
    }
  };

  // Manual enrollment
  const enrollUser = async (sessionId: string, userId: string) => {
    setEnrolling(sessionId);
    try {
      const { data, error } = await supabase.rpc('manual_enroll_user', {
        _user_id: userId,
        _session_id: sessionId,
        _enrolled_by: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;

      toast.success('Utente iscritto con successo!');
      
      // Reload sessions to update available spots
      await loadSessions();
      
      // Clear selection
      setSelectedUser(null);
      
    } catch (error: any) {
      console.error('Error enrolling user:', error);
      toast.error(error.message || 'Errore nell\'iscrizione');
    } finally {
      setEnrolling(null);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [courseId]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim()) {
        searchUsers();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Iscrizione Manuale - {courseName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Search */}
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

          {/* Search Results */}
          {loading && (
            <div className="text-center py-4 text-muted-foreground">
              Ricerca in corso...
            </div>
          )}

          {users.length > 0 && (
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
                      <Badge variant="secondary">
                        {user.current_credits} crediti
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected User Info */}
          {selectedUser && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      Utente Selezionato: {selectedUser.first_name} {selectedUser.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <Badge>
                    {selectedUser.current_credits} crediti disponibili
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Course Sessions */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Sessioni Disponibili
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
                        {format(new Date(session.session_date), 'EEEE dd MMMM yyyy', { locale: undefined })}
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
                      disabled={session.available_spots <= 0 || enrolling === session.id}
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