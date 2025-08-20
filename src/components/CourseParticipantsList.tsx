import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, Mail, Calendar, Plus, Clock, MapPin, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UnsubscribeConfirmDialog } from '@/components/dialogs/UnsubscribeConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';

interface Participant {
  id: string;
  user_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  credits_used: number;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
    current_credits: number;
  };
  subscription?: {
    plan_name: string;
    unlimited_access: boolean;
  };
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_credits: number;
  profile_picture_url?: string;
}

interface CourseSession {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_name?: string;
  available_spots: number;
  max_participants: number;
}

interface CourseParticipantsListProps {
  courseId: string;
  courseName: string;
  maxParticipants?: number;
  reservedSpots?: number;
}

export const CourseParticipantsList: React.FC<CourseParticipantsListProps> = ({ 
  courseId, 
  courseName,
  maxParticipants = 20,
  reservedSpots = 0
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;
      const { data } = await supabase.rpc('get_user_role', { _user_id: user.id });
      setUserRole(data || '');
    };
    checkUserRole();
  }, [user]);
  
  // Participants tab state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Enrollment tab state
  const [searchUsers, setSearchUsers] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [courseSessions, setCourseSessions] = useState<CourseSession[]>([]);
  const [enrollingSessionId, setEnrollingSessionId] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    loadParticipants();
    loadCourseSessions();
  }, [courseId]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredParticipants(participants);
    } else {
      const filtered = participants.filter(p => 
        `${p.user.first_name} ${p.user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredParticipants(filtered);
    }
  }, [searchTerm, participants]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchUsers.length >= 2) {
        searchUsersFunction();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchUsers]);

  const loadParticipants = async () => {
    try {
      console.log('Loading participants for course:', courseId);
      
      // First, get all confirmed bookings for this course
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'confirmed')
        .order('scheduled_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      console.log('Bookings found:', bookings?.length || 0);

      if (!bookings || bookings.length === 0) {
        setParticipants([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      
      // Fetch profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, profile_picture_url, current_credits')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      console.log('Profiles found:', profiles?.length || 0);

      // Enhance with subscription data
      const participantsWithSubs = await Promise.all(
        bookings.map(async (booking: any) => {
          const userProfile = profiles?.find(p => p.user_id === booking.user_id);
          
          const { data: subData } = await supabase
            .from('user_subscriptions')
            .select(`
              subscription_plans!inner(name, unlimited_access)
            `)
            .eq('user_id', booking.user_id)
            .eq('status', 'active')
            .maybeSingle();

          return {
            ...booking,
            user_id: booking.user_id, // Ensure user_id is available for UnsubscribeDialog
            user: userProfile || {
              first_name: 'Nome non trovato',
              last_name: '',
              email: 'Email non trovata',
              current_credits: 0
            },
            subscription: subData?.subscription_plans ? {
              plan_name: subData.subscription_plans.name,
              unlimited_access: subData.subscription_plans.unlimited_access
            } : undefined
          };
        })
      );

      console.log('Final participants:', participantsWithSubs);
      setParticipants(participantsWithSubs);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseSessions = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) throw error;

      setCourseSessions(sessions || []);
    } catch (error) {
      console.error('Error loading course sessions:', error);
    }
  };

  const searchUsersFunction = async () => {
    if (!searchUsers.trim()) return;
    
    setUsersLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, current_credits, profile_picture_url')
        .or(`first_name.ilike.%${searchUsers}%,last_name.ilike.%${searchUsers}%,email.ilike.%${searchUsers}%`)
        .limit(10);

      if (error) throw error;

      const mappedUsers: User[] = (profiles || []).map(profile => ({
        id: profile.user_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        current_credits: profile.current_credits || 0,
        profile_picture_url: profile.profile_picture_url
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Errore",
        description: "Errore durante la ricerca degli utenti",
        variant: "destructive"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const enrollUser = async (sessionId: string, userId: string) => {
    setEnrollingSessionId(sessionId);
    try {
      const { error } = await supabase.rpc('manual_enroll_user', {
        _user_id: userId,
        _session_id: sessionId,
        _enrolled_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Utente iscritto con successo alla sessione"
      });

      // Refresh data
      loadParticipants();
      loadCourseSessions();
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error enrolling user:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'iscrizione",
        variant: "destructive"
      });
    } finally {
      setEnrollingSessionId(null);
    }
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return {
      date: dateObj.toLocaleDateString('it-IT'),
      time: dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatSessionDateTime = (date: string, startTime: string, endTime: string) => {
    const sessionDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateStr = sessionDate.toLocaleDateString('it-IT');
    if (sessionDate.toDateString() === today.toDateString()) {
      dateStr = 'Oggi';
    } else if (sessionDate.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Domani';
    }
    
    return `${dateStr} ${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
  };

  const getSubscriptionBadge = (participant: Participant) => {
    if (!participant.subscription) {
      return <Badge variant="outline">Nessun abbonamento</Badge>;
    }

    if (participant.subscription.unlimited_access) {
      return <Badge variant="default">Unlimited</Badge>;
    }

    return <Badge variant="secondary">{participant.subscription.plan_name}</Badge>;
  };

  const availableSpots = maxParticipants - reservedSpots - participants.length;
  const canManageParticipants = userRole === 'admin' || userRole === 'gym_owner' || userRole === 'instructor';

  if (loading) {
    return <div className="text-center py-8">Caricamento partecipanti...</div>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {participants.length}/{maxParticipants}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partecipanti al corso</DialogTitle>
          <DialogDescription>
            {courseName} - {participants.length}/{maxParticipants} posti occupati
            {availableSpots > 0 && ` • ${availableSpots} posti disponibili`}
            {reservedSpots > 0 && ` • ${reservedSpots} posti riservati`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="participants" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Partecipanti Attuali
            </TabsTrigger>
            {canManageParticipants && (
              <TabsTrigger value="enroll" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Iscrivere Utente
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="participants" className="space-y-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Invia Email
            </Button>
          </div>

          {/* Stats */}
          <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
            <span>{filteredParticipants.length} risultati trovati</span>
            <div className="flex items-center gap-4">
              <span>Occupati: {participants.length}/{maxParticipants}</span>
              {availableSpots > 0 && <span className="text-green-600">Disponibili: {availableSpots}</span>}
              {reservedSpots > 0 && <span>Riservati: {reservedSpots}</span>}
            </div>
          </div>

          {/* Participants List */}
          <div className="space-y-3">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nessun partecipante trovato' : 'Nessun partecipante iscritto'}
              </div>
            ) : (
              filteredParticipants.map((participant) => {
                const { date, time } = formatDateTime(
                  participant.scheduled_date,
                  participant.scheduled_time
                );

                return (
                  <Card key={participant.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={participant.user.profile_picture_url} />
                            <AvatarFallback>
                              {participant.user.first_name?.[0]}{participant.user.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">
                                {participant.user.first_name} {participant.user.last_name}
                              </h4>
                              {getSubscriptionBadge(participant)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {participant.user.email}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {date} alle {time}
                              </span>
                              <span>
                                Crediti: {participant.user.current_credits}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {participant.status}
                          </Badge>
                          {canManageParticipants && (
                            <UnsubscribeConfirmDialog
                              participant={participant}
                              courseId={courseId}
                              courseName={courseName}
                              onUnsubscribeSuccess={loadParticipants}
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          </TabsContent>

          {canManageParticipants && (
            <TabsContent value="enroll" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Search */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Cerca Utente
                    </CardTitle>
                    <CardDescription>
                      Cerca per nome o email per trovare l'utente da iscrivere
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cerca utente..."
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {usersLoading && (
                      <div className="text-center py-4 text-muted-foreground">
                        Ricerca in corso...
                      </div>
                    )}

                    {users.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedUser?.id === user.id
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedUser(user)}
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.profile_picture_url} />
                                <AvatarFallback>
                                  {user.first_name?.[0]}{user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Crediti: {user.current_credits}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedUser && (
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={selectedUser.profile_picture_url} />
                              <AvatarFallback>
                                {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-medium">
                                {selectedUser.first_name} {selectedUser.last_name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {selectedUser.email}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Crediti disponibili: {selectedUser.current_credits}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>

                {/* Course Sessions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Sessioni Disponibili
                    </CardTitle>
                    <CardDescription>
                      Seleziona una sessione per iscrivere l'utente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedUser ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Seleziona prima un utente
                      </div>
                    ) : courseSessions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nessuna sessione disponibile
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {courseSessions.map((session) => (
                          <Card key={session.id} className="border">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Clock className="h-4 w-4" />
                                    {formatSessionDateTime(session.session_date, session.start_time, session.end_time)}
                                  </div>
                                  {session.room_name && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3" />
                                      {session.room_name}
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    Posti: {session.available_spots}/{session.max_participants}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => enrollUser(session.id, selectedUser.id)}
                                  disabled={session.available_spots <= 0 || enrollingSessionId === session.id}
                                  className="flex items-center gap-1"
                                >
                                  {enrollingSessionId === session.id ? (
                                    'Iscrizione...'
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4" />
                                      Iscrivi
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};