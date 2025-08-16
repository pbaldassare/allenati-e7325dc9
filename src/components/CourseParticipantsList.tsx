import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Search, Mail, UserMinus, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
    current_credits: number;
  };
  subscription?: {
    plan_name: string;
    unlimited_access: boolean;
  };
}

interface CourseParticipantsListProps {
  courseId: string;
  courseName: string;
}

export const CourseParticipantsList: React.FC<CourseParticipantsListProps> = ({ 
  courseId, 
  courseName 
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParticipants();
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

  if (loading) {
    return <div className="text-center py-8">Caricamento partecipanti...</div>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Partecipanti ({participants.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partecipanti - {courseName}</DialogTitle>
          <DialogDescription>
            Lista dei partecipanti che hanno prenotato questo corso
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
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Totale partecipanti: {participants.length}</span>
            <span>•</span>
            <span>Visualizzati: {filteredParticipants.length}</span>
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
                          <Badge 
                            variant={participant.status === 'confirmed' ? 'default' : 'secondary'}
                          >
                            {participant.status === 'confirmed' ? 'Confermato' : participant.status}
                          </Badge>
                          
                          <Button variant="outline" size="sm">
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
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