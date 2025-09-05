import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, Calendar, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Participant {
  id: string;
  user_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
    belt?: string;
  };
  subscription?: {
    plan_name: string;
    unlimited_access: boolean;
  };
}

interface CourseParticipantsViewModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CourseParticipantsViewModal: React.FC<CourseParticipantsViewModalProps> = ({ 
  sessionId, 
  isOpen, 
  onClose 
}) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    if (isOpen && sessionId) {
      loadParticipants();
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;
      const { data } = await supabase.rpc('get_user_role', { _user_id: user.id });
      setUserRole(data || '');
    };
    checkUserRole();
  }, [user]);

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

  const loadParticipants = async () => {
    try {
      setLoading(true);
      
      // Get all data in one optimized query with joins
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          courses!inner(name),
          profiles!inner(user_id, first_name, last_name, email, profile_picture_url, belt),
          user_subscriptions(
            subscription_plans!inner(name, unlimited_access)
          )
        `)
        .eq('session_id', sessionId)
        .eq('status', 'confirmed')
        .eq('user_subscriptions.status', 'active')
        .order('scheduled_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      if (!bookingsData || bookingsData.length === 0) {
        setParticipants([]);
        return;
      }

      // Set course name from first booking
      if (bookingsData.length > 0 && bookingsData[0].courses) {
        setCourseName(bookingsData[0].courses.name);
      }

      // Transform the data
      const participantsWithSubs = bookingsData.map((booking: any) => ({
        ...booking,
        user: booking.profiles || {
          first_name: 'Nome non trovato',
          last_name: '',
          email: 'Email non trovata'
        },
        subscription: booking.user_subscriptions?.[0]?.subscription_plans ? {
          plan_name: booking.user_subscriptions[0].subscription_plans.name,
          unlimited_access: booking.user_subscriptions[0].subscription_plans.unlimited_access
        } : undefined
      }));

      setParticipants(participantsWithSubs);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return {
      date: dateObj.toLocaleDateString('it-IT'),
      time: dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    };
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

  const getBeltBadge = (belt?: string) => {
    if (!belt) return null;
    
    const beltColors: Record<string, string> = {
      'Nessuna': 'bg-muted text-muted-foreground border border-muted-foreground/30',
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Partecipanti alla sessione
          </DialogTitle>
          <DialogDescription>
            {courseName} - {participants.length} partecipanti iscritti
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {filteredParticipants.length} risultati trovati
          </div>

          {/* Participants List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Caricamento partecipanti...
              </div>
            ) : filteredParticipants.length === 0 ? (
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
                              {getBeltBadge(participant.user.belt)}
                              {isStaff && getSubscriptionBadge(participant)}
                            </div>
                            {isStaff && (
                              <>
                                <div className="text-sm text-muted-foreground">
                                  {participant.user.email}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {date} alle {time}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {isStaff && (
                          <Badge variant="outline">
                            {participant.status}
                          </Badge>
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