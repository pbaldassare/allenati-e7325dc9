import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GymDocumentsManagement } from '@/components/GymDocumentsManagement';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GymMember {
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface OwnerDocumentsManagerProps {
  gymId: string;
}

export const OwnerDocumentsManager: React.FC<OwnerDocumentsManagerProps> = ({ gymId }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<GymMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGymMembers();
  }, [gymId]);

  const fetchGymMembers = async () => {
    try {
      // Prima prendiamo le membership
      const { data: memberships, error: membershipError } = await supabase
        .from('user_gym_memberships')
        .select('user_id')
        .eq('gym_id', gymId)
        .eq('status', 'active');

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length === 0) {
        setLoading(false);
        return;
      }

      // Poi prendiamo i profili di questi utenti
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds)
        .order('last_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Combiniamo i dati
      const membersData: GymMember[] = profiles?.map(profile => ({
        user_id: profile.user_id,
        profiles: {
          first_name: profile.first_name || 'Nome',
          last_name: profile.last_name || 'Cognome',
          email: profile.email || '',
        }
      })) || [];

      setMembers(membersData);
      
      // Seleziona il primo utente per default
      if (membersData.length > 0) {
        setSelectedUserId(membersData[0].user_id);
      }
    } catch (error) {
      console.error('Error fetching gym members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento membri...</div>;
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Nessun membro trovato per questa palestra</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seleziona Utente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="user-select">Documenti per</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Seleziona un utente" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.profiles?.first_name} {member.profiles?.last_name} ({member.profiles?.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <GymDocumentsManagement 
          gymId={gymId} 
          userId={selectedUserId}
          isOwner={true} 
        />
      )}
    </div>
  );
};