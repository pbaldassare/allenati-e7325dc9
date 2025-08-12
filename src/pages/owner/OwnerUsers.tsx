import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Utenti Palestra | Gym Manager';
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, profile_picture_url');

      if (!error && data) setMembers(data as MemberProfile[]);
      setLoading(false);
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
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>Nessun membro trovato.</TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => (
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
