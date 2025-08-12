import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface MemberProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
}

const OwnerUsers = () => {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Utenti Palestra | Gym Manager';
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        if (!userId) {
          setMembers([]);
          return;
        }

        const { data: gymId, error: gymErr } = await (supabase as any).rpc('get_user_gym_id', { _user_id: userId });
        if (gymErr) throw gymErr;
        if (!gymId) {
          setMembers([]);
          toast({ title: 'Nessuna palestra trovata', description: 'Associa prima una palestra al tuo account.', variant: 'destructive' });
          return;
        }

        const { data: memberships, error: memErr } = await supabase
          .from('user_gym_memberships')
          .select('user_id')
          .eq('gym_id', gymId)
          .eq('status', 'active');
        
        if (memErr) throw memErr;

        const userIds = (memberships || []).map((m: { user_id: string }) => m.user_id);
        if (userIds.length === 0) {
          setMembers([]);
          return;
        }

        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, profile_picture_url')
          .in('user_id', userIds);
        
        if (profErr) throw profErr;

        setMembers((profiles || []) as MemberProfile[]);
      } catch (e: any) {
        console.error('loadMembers error', e);
        toast({ title: 'Errore caricamento utenti', description: e?.message ?? 'Qualcosa è andato storto', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  const promoteToInstructor = async (userId: string) => {
    try {
      setPromoting(userId);
      const { error } = await (supabase as any).rpc('promote_user_to_instructor', {
        target_user_id: userId,
        bio: null,
      });
      if (error) throw error;

      toast({ title: 'Utente promosso', description: 'Ora è un istruttore della tua palestra.' });
    } catch (e: any) {
      toast({ title: 'Errore', description: e.message || 'Impossibile promuovere utente', variant: 'destructive' });
    } finally {
      setPromoting(null);
    }
  };

  const listToShow = (query.trim()
    ? members.filter((m) => `${m.first_name} ${m.last_name}`.toLowerCase().includes(query.toLowerCase()))
    : members);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Utenti della Palestra
        </h1>
        <p className="text-muted-foreground">Gestisci i membri della tua palestra</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Elenco Membri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <Input
              placeholder="Cerca per nome o cognome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2}>Caricamento...</TableCell>
                  </TableRow>
                ) : listToShow.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>
                      {members.length === 0
                        ? 'Nessun membro nella palestra.'
                        : 'Nessun risultato per la ricerca.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  listToShow.map((m) => (
                    <TableRow key={m.user_id}>
                      <TableCell>{m.first_name} {m.last_name}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => promoteToInstructor(m.user_id)} disabled={promoting === m.user_id}>
                          {promoting === m.user_id ? 'Promozione…' : 'Promuovi a Istruttore'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerUsers;
