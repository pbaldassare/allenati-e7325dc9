import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MemberProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  membership_status: string;
  membership_type: string;
}

const OwnerUsers = () => {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
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
          .select('user_id, status, membership_type')
          .eq('gym_id', gymId);
        
        if (memErr) throw memErr;

        const userIds = (memberships || []).map((m: { user_id: string }) => m.user_id);
        if (userIds.length === 0) {
          setMembers([]);
          return;
        }

        const membershipByUser = new Map(
          (memberships || []).map((m: any) => [m.user_id, { status: m.status, membership_type: m.membership_type }])
        );

        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, profile_picture_url')
          .in('user_id', userIds);
        
        if (profErr) throw profErr;

        const combined = (profiles || []).map((p: any) => ({
          user_id: p.user_id,
          first_name: p.first_name,
          last_name: p.last_name,
          profile_picture_url: p.profile_picture_url,
          membership_status: membershipByUser.get(p.user_id)?.status ?? 'unknown',
          membership_type: membershipByUser.get(p.user_id)?.membership_type ?? 'member',
        }));

        setMembers(combined as MemberProfile[]);
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

  const addMemberByEmail = async () => {
    if (!newMemberEmail.trim()) {
      toast({ title: 'Errore', description: 'Inserisci un indirizzo email valido', variant: 'destructive' });
      return;
    }

    setAddingMember(true);
    try {
      const { data, error } = await supabase.functions.invoke('owner-link-member', {
        body: { email: newMemberEmail.trim() }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Add new member to current list
      setMembers(prev => [...prev, data.member]);
      
      toast({ 
        title: 'Membro aggiunto', 
        description: `${data.member.first_name} ${data.member.last_name} è stato aggiunto alla palestra.` 
      });
      
      setNewMemberEmail('');
      setAddMemberDialogOpen(false);
    } catch (e: any) {
      toast({ 
        title: 'Errore', 
        description: e.message || 'Impossibile aggiungere il membro', 
        variant: 'destructive' 
      });
    } finally {
      setAddingMember(false);
    }
  };

const normalizedQuery = query.trim().toLowerCase();
  const filteredByStatus = showInactive ? members : members.filter((m) => m.membership_status === 'active');
  const listToShow = normalizedQuery
    ? filteredByStatus.filter((m) => `${m.first_name} ${m.last_name}`.toLowerCase().includes(normalizedQuery))
    : filteredByStatus;

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
          <div className="flex justify-between items-center">
            <CardTitle>Elenco Membri</CardTitle>
            <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aggiungi Nuovo Membro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email del nuovo membro</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="esempio@email.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !addingMember) {
                          addMemberByEmail();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button onClick={addMemberByEmail} disabled={addingMember}>
                      {addingMember ? 'Aggiunta...' : 'Aggiungi'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Cerca per nome o cognome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Switch id="show-inactive" checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
              <Label htmlFor="show-inactive">Mostra inattivi</Label>
            </div>
          </div>
          <TooltipProvider><div className="overflow-x-auto">
            <Table>
<TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Azione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Caricamento...</TableCell>
                  </TableRow>
                ) : listToShow.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
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
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={m.membership_status === 'active' ? 'default' : 'secondary'}>
                              {m.membership_status}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Stato della membership dell'utente</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.membership_type || 'member'}</Badge>
                      </TableCell>
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
          </div></TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerUsers;
