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
  course_id: string;
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
    belt?: string;
  };
  subscription?: {
    plan_name: string;
    unlimited_access: boolean;
  };
  courses?: {
    course_categories?: {
      main_categories?: {
        requires_belt: boolean;
      };
    };
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
  sessionId: string;
  courseName: string;
  maxParticipants?: number;
  reservedSpots?: number;
}

export const CourseParticipantsList: React.FC<CourseParticipantsListProps> = ({ 
  sessionId, 
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
  }, [sessionId]);

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
      console.log('Loading participants for session:', sessionId);
      
      // Get all data in one optimized query with joins
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!inner(user_id, first_name, last_name, email, profile_picture_url, belt),
          user_subscriptions(
            subscription_plans!inner(name, unlimited_access)
          ),
          courses!inner(
            course_categories!inner(
              main_categories!inner(requires_belt)
            )
          )
        `)
        .eq('session_id', sessionId)
        .eq('status', 'confirmed')
        .eq('user_subscriptions.status', 'active')
        .order('scheduled_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      console.log('Bookings found:', bookingsData?.length || 0);

      if (!bookingsData || bookingsData.length === 0) {
        setParticipants([]);
        return;
      }

      // Get gym-specific credits for each participant
      const userIds = bookingsData.map(booking => booking.user_id);
      const { data: gymCreditsData } = await supabase
        .from('gym_credits')
        .select('user_id, credits')
        .in('user_id', userIds);

      // Transform the data
      const participantsWithSubs = bookingsData.map((booking: any) => {
        const userGymCredits = gymCreditsData?.find(gc => gc.user_id === booking.user_id);
        
        return {
          ...booking,
          user_id: booking.user_id, // Ensure user_id is available for UnsubscribeDialog
          user: booking.profiles ? {
            ...booking.profiles,
            current_credits: userGymCredits?.credits || 0 // Use gym-specific credits
          } : {
            first_name: 'Nome non trovato',
            last_name: '',
            email: 'Email non trovata',
            current_credits: 0
          },
          subscription: booking.user_subscriptions?.[0]?.subscription_plans ? {
            plan_name: booking.user_subscriptions[0].subscription_plans.name,
            unlimited_access: booking.user_subscriptions[0].subscription_plans.unlimited_access
          } : undefined
        };
      });

      console.log('Final participants:', participantsWithSubs);
      setParticipants(participantsWithSubs);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove loadCourseSessions since we're now session-specific

  const searchUsersFunction = async () => {
    if (!searchUsers.trim()) return;
    
    setUsersLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, profile_picture_url')
        .or(`first_name.ilike.%${searchUsers}%,last_name.ilike.%${searchUsers}%,email.ilike.%${searchUsers}%`)
        .limit(10);

      if (error) throw error;

      // Get gym-specific credits for each user
      const mappedUsers: User[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get gym-specific credits - we'd need gym context here
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
            profile_picture_url: profile.profile_picture_url
          };
        })
      );

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

  const getBeltBadge = (belt?: string, courseCategory?: any) => {
    if (!belt || belt === 'Nessuna') return null;
    
    // Only show belt if the course requires it (martial arts)
    if (!courseCategory?.main_categories?.requires_belt) return null;
    
    const beltColors: Record<string, string> = {
      'Bianca': 'bg-white text-black border border-gray-300',
      'Blu': 'bg-blue-500 text-white',
      'Viola': 'bg-purple-500 text-white',
      'Marrone': 'bg-amber-800 text-white',
      'Nera': 'bg-black text-white'
    };
    
    return (
      <Badge className={beltColors[belt] || 'bg-gray-500 text-white'}>
        Cintura {belt}
      </Badge>
    );
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

        <div className="space-y-4">

          
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

                const isStaff = userRole === 'admin' || userRole === 'gym_owner' || userRole === 'instructor';

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
                              {getBeltBadge(participant.user.belt, participant.courses?.course_categories)}
                              {isStaff && getSubscriptionBadge(participant)}
                            </div>
                            {isStaff && (
                              <>
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
                              </>
                            )}
                          </div>
                        </div>

                        {isStaff && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {participant.status}
                            </Badge>
                             {canManageParticipants && (
                              <UnsubscribeConfirmDialog
                                participant={participant}
                                courseId={participant.course_id}
                                courseName={courseName}
                                onUnsubscribeSuccess={loadParticipants}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};