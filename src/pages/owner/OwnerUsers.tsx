
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, UserCheck, UserMinus, Crown, Shield, Users, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MedicalCertificateUploadDialog from '@/components/MedicalCertificateUploadDialog';

interface MemberProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  profile_picture_url: string | null;
  membership_status: string;
  membership_type: string;
  user_roles: string[];
  is_instructor: boolean;
  // Added medical certificate info
  medical_expiry_date?: string | null;
  medical_file_path?: string | null;
  medical_status?: string | null;
}

const OwnerUsers = () => {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [demoting, setDemoting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [instructorBio, setInstructorBio] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const { toast } = useToast();

  // New: auth user id and upload dialog state
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    document.title = 'Utenti Palestra | Gym Manager';
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        setAuthUserId(userId ?? null);
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

        // Get profiles
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, profile_picture_url')
          .in('user_id', userIds);
        
        if (profErr) throw profErr;

        // Get user roles
        const { data: userRoles, error: rolesErr } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds)
          .eq('is_active', true);
        
        if (rolesErr) throw rolesErr;

        // Get instructor status
        const { data: instructors, error: instructorErr } = await supabase
          .from('instructors')
          .select('user_id')
          .in('user_id', userIds)
          .eq('is_active', true)
          .eq('gym_id', gymId);
        
        if (instructorErr) throw instructorErr;

        // New: Get latest medical certificate per user for this gym
        const { data: certs, error: certsErr } = await supabase
          .from('medical_certificates')
          .select('user_id, expiry_date, file_path, status, created_at')
          .eq('gym_id', gymId)
          .in('user_id', userIds)
          .order('created_at', { ascending: false });
        if (certsErr) throw certsErr;

        const latestCertByUser = new Map<string, { expiry_date: string | null; file_path: string | null; status: string | null }>();
        (certs || []).forEach((c: any) => {
          if (!latestCertByUser.has(c.user_id)) {
            latestCertByUser.set(c.user_id, {
              expiry_date: c.expiry_date ?? null,
              file_path: c.file_path ?? null,
              status: c.status ?? null,
            });
          }
        });

        // Group roles by user
        const rolesByUser = new Map<string, string[]>();
        (userRoles || []).forEach((ur: any) => {
          if (!rolesByUser.has(ur.user_id)) {
            rolesByUser.set(ur.user_id, []);
          }
          rolesByUser.get(ur.user_id)!.push(ur.role);
        });

        // Set of instructor user IDs
        const instructorUserIds = new Set((instructors || []).map((i: any) => i.user_id));

        const combined = (profiles || []).map((p: any) => {
          const cert = latestCertByUser.get(p.user_id);
          return {
            user_id: p.user_id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
            profile_picture_url: p.profile_picture_url,
            membership_status: membershipByUser.get(p.user_id)?.status ?? 'unknown',
            membership_type: membershipByUser.get(p.user_id)?.membership_type ?? 'member',
            user_roles: rolesByUser.get(p.user_id) || ['basic_user'],
            is_instructor: instructorUserIds.has(p.user_id),
            medical_expiry_date: cert?.expiry_date ?? null,
            medical_file_path: cert?.file_path ?? null,
            medical_status: cert?.status ?? null,
          } as MemberProfile;
        });

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

  // Helper function to get the highest priority role
  const getHighestRole = (roles: string[]) => {
    if (roles.includes('admin')) return { role: 'admin', label: 'Admin', icon: Crown, variant: 'destructive' as const };
    if (roles.includes('gym_owner')) return { role: 'gym_owner', label: 'Proprietario', icon: Shield, variant: 'default' as const };
    if (roles.includes('instructor')) return { role: 'instructor', label: 'Istruttore', icon: UserCheck, variant: 'secondary' as const };
    return { role: 'basic_user', label: 'Membro', icon: Users, variant: 'outline' as const };
  };

  const reloadMembers = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) return;

    const { data: gymId } = await (supabase as any).rpc('get_user_gym_id', { _user_id: userId });
    if (!gymId) return;

    // Trigger page reload to get fresh data
    window.location.reload();
  };

  const handlePromoteClick = (userId: string) => {
    setSelectedUserId(userId);
    setPromoteDialogOpen(true);
  };

  const promoteToInstructor = async () => {
    if (!selectedUserId) return;
    
    try {
      setPromoting(selectedUserId);
      const { error } = await (supabase as any).rpc('promote_user_to_instructor', {
        target_user_id: selectedUserId,
        bio: instructorBio.trim() || null,
      });
      if (error) throw error;

      toast({ title: 'Utente promosso', description: 'Ora è un istruttore della tua palestra.' });
      setPromoteDialogOpen(false);
      setInstructorBio('');
      setSelectedUserId(null);
      await reloadMembers();
    } catch (e: any) {
      toast({ title: 'Errore', description: e.message || 'Impossibile promuovere utente', variant: 'destructive' });
    } finally {
      setPromoting(null);
    }
  };

  const demoteInstructor = async (userId: string) => {
    try {
      setDemoting(userId);
      const { error } = await (supabase as any).rpc('demote_instructor_to_user', {
        target_user_id: userId,
      });
      if (error) throw error;

      toast({ title: 'Istruttore retrocesso', description: 'Ora è un membro normale della palestra.' });
      await reloadMembers();
    } catch (e: any) {
      toast({ title: 'Errore', description: e.message || 'Impossibile retrocedere istruttore', variant: 'destructive' });
    } finally {
      setDemoting(null);
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

  // New: open certificate file via signed URL
  const viewCertificate = async (filePath: string | null | undefined) => {
    if (!filePath) {
      toast({ title: 'Nessun certificato', description: 'Nessun file disponibile per questo utente.' });
      return;
    }
    const { data, error } = await supabase.storage.from('medical-certificates').createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      console.error('Signed URL error', error);
      toast({ title: 'Errore', description: 'Impossibile aprire il certificato', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
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
          
          <TooltipProvider>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Certificato</TableHead>
                    <TableHead>Azione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}>Caricamento...</TableCell>
                    </TableRow>
                  ) : listToShow.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        {members.length === 0
                          ? 'Nessun membro nella palestra.'
                          : 'Nessun risultato per la ricerca.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    listToShow.map((m) => {
                      const roleInfo = getHighestRole(m.user_roles);
                      const RoleIcon = roleInfo.icon;
                      const isAdminOrOwner = m.user_roles.includes('admin') || m.user_roles.includes('gym_owner');

                      const expiryLabel = m.medical_expiry_date
                        ? new Date(m.medical_expiry_date).toLocaleDateString('it-IT')
                        : 'N/D';
                      
                      return (
                        <TableRow key={m.user_id}>
                          <TableCell className="font-medium">{m.first_name} {m.last_name}</TableCell>
                          <TableCell className="text-muted-foreground">{m.email || 'N/D'}</TableCell>
                          <TableCell>
                            <Badge variant={roleInfo.variant} className="flex items-center gap-1 w-fit">
                              <RoleIcon className="h-3 w-3" />
                              {roleInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={m.membership_status === 'active' ? 'default' : 'secondary'}>
                              {m.membership_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Scadenza: {expiryLabel}
                              </Badge>
                              {m.medical_file_path && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => viewCertificate(m.medical_file_path!)}
                                >
                                  Vedi
                                </Button>
                              )}
                              {m.user_id === authUserId && (
                                <Button
                                  size="sm"
                                  onClick={() => setUploadDialogOpen(true)}
                                >
                                  Carica certificato
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isAdminOrOwner ? (
                              <Badge variant="outline" className="text-muted-foreground">
                                Non modificabile
                              </Badge>
                            ) : m.is_instructor ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    disabled={demoting === m.user_id}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    {demoting === m.user_id ? 'Rimozione...' : 'Rimuovi Istruttore'}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Rimuovere ruolo di istruttore?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Stai per rimuovere {m.first_name} {m.last_name} dal ruolo di istruttore.
                                      Perderà tutti i privilegi di istruttore e tornerà ad essere un membro normale.
                                      Questa azione è reversibile.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => demoteInstructor(m.user_id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Rimuovi Istruttore
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => handlePromoteClick(m.user_id)}
                                disabled={promoting === m.user_id}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                {promoting === m.user_id ? 'Promozione...' : 'Promuovi Istruttore'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Promotion Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promuovi a Istruttore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Stai per promuovere questo utente al ruolo di istruttore. Avrà accesso a funzionalità avanzate come la gestione dei corsi.
            </p>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio dell'istruttore (opzionale)</Label>
              <Textarea
                id="bio"
                placeholder="Descrizione delle specializzazioni e esperienze dell'istruttore..."
                value={instructorBio}
                onChange={(e) => setInstructorBio(e.target.value)}
                className="min-h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={promoteToInstructor} disabled={promoting !== null}>
              {promoting ? 'Promozione...' : 'Promuovi a Istruttore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload medical certificate dialog for current user */}
      <MedicalCertificateUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploaded={reloadMembers}
      />
    </div>
  );
};

export default OwnerUsers;
