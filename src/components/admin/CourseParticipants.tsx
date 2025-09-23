import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Search, Mail, Phone, Calendar, UserMinus } from 'lucide-react';

interface CourseParticipantsProps {
  courseId: string;
}

export const CourseParticipants: React.FC<CourseParticipantsProps> = ({ courseId }) => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredParticipants, setFilteredParticipants] = useState<any[]>([]);

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
      setLoading(true);
      
      // Get all confirmed bookings for this course
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'confirmed')
        .order('scheduled_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      if (!bookings || bookings.length === 0) {
        setParticipants([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      
      // Get course gym_id
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('gym_id')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Fetch profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, profile_picture_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Get subscription and credits data for each user
      const participantsWithData = await Promise.all(
        bookings.map(async (booking: any) => {
          const userProfile = profiles?.find(p => p.user_id === booking.user_id);
          
          // Get gym-specific subscription
          const { data: subData } = await supabase
            .from('user_subscriptions')
            .select('subscription_plans!inner(name, unlimited_access)')
            .eq('user_id', booking.user_id)
            .eq('gym_id', courseData.gym_id)
            .eq('status', 'active')
            .gte('expires_at', new Date().toISOString())
            .maybeSingle();

          // Get gym-specific credits
          const { data: gymCredits } = await supabase
            .from('gym_credits')
            .select('credits')
            .eq('user_id', booking.user_id)
            .eq('gym_id', courseData.gym_id)
            .maybeSingle();

          return {
            ...booking,
            user: {
              ...(userProfile || {
                first_name: 'Nome non trovato',
                last_name: '',
                email: 'Email non trovata',
              }),
              current_credits: gymCredits?.credits || 0
            },
            subscription: subData?.subscription_plans ? {
              plan_name: subData.subscription_plans.name,
              unlimited_access: subData.subscription_plans.unlimited_access
            } : { plan_name: 'Nessuno', unlimited_access: false }
          };
        })
      );

      setParticipants(participantsWithData);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Partecipanti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Caricamento partecipanti...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Partecipanti ({participants.length})</span>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Invia Email
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca partecipanti..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Participants List */}
        <div className="space-y-3">
          {filteredParticipants.map((participant) => {
            return (
              <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-primary text-white text-xs">
                      {participant.user.first_name?.[0]}{participant.user.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {participant.user.first_name} {participant.user.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{participant.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant={participant.subscription?.unlimited_access ? 'default' : 'secondary'}>
                    {participant.subscription?.plan_name}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredParticipants.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'Nessun partecipante trovato' : 'Nessun partecipante iscritto'}
            </p>
          </div>
        )}

        {/* Waiting List */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Lista d'Attesa (0)</h4>
          <p className="text-sm text-muted-foreground">
            Nessuno in lista d'attesa
          </p>
        </div>
      </CardContent>
    </Card>
  );
};