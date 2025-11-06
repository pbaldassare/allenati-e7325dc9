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
import { Plus, UserCheck, UserMinus, Crown, Shield, Users, FileText, Phone, CreditCard, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MedicalCertificateUploadDialog from '@/components/MedicalCertificateUploadDialog';
import { OwnerUserStats } from '@/components/owner/OwnerUserStats';
import { useIsMobile } from '@/hooks/use-mobile';
import UserDetailsModal from '@/components/owner/UserDetailsModal';
import { ManualCreditAssignmentDialog } from '@/components/owner/ManualCreditAssignmentDialog';
import { DeleteUserConfirmDialog } from '@/components/dialogs/DeleteUserConfirmDialog';
import { useOwnerGym } from '@/contexts/OwnerGymContext';

interface MemberProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  fiscal_code?: string;
  profile_picture_url: string | null;
  membership_status: string;
  membership_type: string;
  user_roles: string[];
  is_instructor: boolean;
  // Added medical certificate info
  medical_expiry_date?: string | null;
  medical_file_path?: string | null;
  // Added belt info
  belt?: string | null;
}

const OwnerUsers = () => {
  const isMobile = useIsMobile();
  const { selectedGym } = useOwnerGym();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [demoting, setDemoting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showOnlyWithoutCert, setShowOnlyWithoutCert] = useState(false);
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
  
  // User details modal state
  const [userDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<string | null>(null);
  
  // Credit assignment dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUserForCredits, setSelectedUserForCredits] = useState<MemberProfile | null>(null);
  
  // User credits state
  const [userCredits, setUserCredits] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    document.title = 'Utenti Palestra | Gym Manager';
  }, []);

  const loadMembers = async (forceRefresh = false) => {
    console.log('👥 OwnerUsers - DEBUG START:', {
      selectedGym: selectedGym?.id,
      selectedGymName: selectedGym?.name,
      timestamp: new Date().toISOString(),
      forceRefresh,
      isMobile,
      userAgent: navigator.userAgent,
      screenSize: { width: window.innerWidth, height: window.innerHeight }
    });

    if (!selectedGym?.id) {
      console.log('❌ No selectedGym, clearing members');
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Force cache clear if requested
      if (forceRefresh) {
        console.log('🔄 Force refreshing Supabase connection...');
        // Force a new connection to clear any cached data
        await supabase.removeAllChannels();
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const { data: userRes, error: authError } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      
      console.log('🔐 Auth check:', { userId, authError });
      
      setAuthUserId(userId ?? null);
      if (!userId) {
        console.log('❌ No authenticated user');
        setMembers([]);
        return;
      }

      console.log('🔍 Loading members for gym:', selectedGym.id, selectedGym.name);

      // Step 1: Get gym memberships first
      const { data: memberships, error: memErr } = await supabase
        .from('user_gym_memberships')
        .select('user_id, status, membership_type')
        .eq('gym_id', selectedGym.id);
      
      console.log('📊 Memberships query result:', {
        count: memberships?.length || 0,
        error: memErr,
        sample: memberships?.slice(0, 3)
      });
      
      if (memErr) throw memErr;

      const userIds = (memberships || []).map((m: { user_id: string }) => m.user_id);
      if (userIds.length === 0) {
        console.log('ℹ️ No memberships found for gym:', selectedGym.id);
        setMembers([]);
        return;
      }

      const membershipByUser = new Map(
        (memberships || []).map((m: any) => [m.user_id, { status: m.status, membership_type: m.membership_type }])
      );

      // Step 2: Get all profiles for these users with enhanced debugging
      console.log('🔍 DEBUG: Loading profiles for user_ids:', userIds.slice(0, 5), '... (total:', userIds.length, ')');
      
      let { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone, fiscal_code, profile_picture_url, belt')
        .in('user_id', userIds);

      console.log('👤 Profiles query result:', {
        requestedUserIds: userIds.length,
        foundProfiles: profiles?.length || 0,
        error: profilesErr,
        missingUserIds: userIds.filter(id => !profiles?.find(p => p.user_id === id))
      });

      if (profilesErr) {
        console.error('❌ Profiles query failed:', profilesErr);
        console.log('🔄 Attempting fallback profile query without RLS constraints...');
        
        // Try fallback query that bypasses potential RLS issues
        const { data: fallbackProfiles, error: fallbackError } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, phone, profile_picture_url, email, fiscal_code, belt");
        
        if (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError);
          throw profilesErr;
        } else {
          console.log('✅ Fallback query succeeded, filtering relevant profiles...');
          const userIdSet = new Set(userIds);
          profiles = fallbackProfiles?.filter(p => userIdSet.has(p.user_id)) || [];
          console.log(`📊 Fallback loaded ${profiles.length} profiles for ${userIds.length} users`);
          profilesErr = null; // Clear error since fallback succeeded
        }
      }

      // Fallback: If batch query didn't get all profiles, try individual queries
      const missingUserIds = userIds.filter(id => !profiles?.find(p => p.user_id === id));
      let allProfiles = profiles || [];

        if (missingUserIds.length > 0) {
        console.log('🔍 Missing profiles detected, trying alternative query:', missingUserIds);
        
        // Try alternative query with explicit JOIN to bypass potential RLS issues
        const { data: altProfiles, error: altError } = await supabase
          .from('user_gym_memberships')
          .select(`
            user_id,
            profiles!inner(
              user_id,
              first_name,
              last_name,
              email,
              phone,
              fiscal_code,
              profile_picture_url,
              belt
            )
          `)
          .eq('gym_id', selectedGym.id)
          .in('user_id', missingUserIds);
        
        if (!altError && altProfiles) {
          const recoveredProfiles = altProfiles.map((item: any) => item.profiles);
          allProfiles.push(...recoveredProfiles);
          console.log(`✅ Recovered ${recoveredProfiles.length} profiles via alternative query`);
        } else {
          console.error('🚨 Alternative query also failed:', altError);
        }
        
        console.log('📊 Final profiles after individual recovery:', {
          total: allProfiles.length,
          recovered: allProfiles.length - (profiles?.length || 0),
          stillMissing: userIds.length - allProfiles.length
        });
      }

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
          .eq('gym_id', selectedGym.id);
        
        if (instructorErr) throw instructorErr;

        // New: Get latest medical certificate per user for this gym
        const { data: certs, error: certsErr } = await supabase
          .from('medical_certificates')
          .select('user_id, expiry_date, file_path, created_at')
          .eq('gym_id', selectedGym.id)
          .in('user_id', userIds)
          .order('created_at', { ascending: false });
        if (certsErr) throw certsErr;

        const latestCertByUser = new Map<string, { expiry_date: string | null; file_path: string | null }>();
        (certs || []).forEach((c: any) => {
          if (!latestCertByUser.has(c.user_id)) {
            latestCertByUser.set(c.user_id, {
              expiry_date: c.expiry_date ?? null,
              file_path: c.file_path ?? null,
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

        // Create combined member data - ensure all users from memberships are included
        const combined = userIds.map((userId: string) => {
          const profile = allProfiles.find((p: any) => p.user_id === userId);
          const cert = latestCertByUser.get(userId);
          
          // Enhanced debugging for missing profile data
          if (!profile) {
            console.error(`🚨 CRITICAL: No profile found for user_id: ${userId} - This is a DATA ACCESS BUG!`);
            console.error(`🔍 DEBUG: Checking if profile exists in all loaded profiles...`);
            const debugProfile = allProfiles.find((p: any) => p.user_id === userId);
            console.error(`🔍 Profile check result:`, debugProfile);
          } else if (!profile.first_name || !profile.last_name || !profile.email) {
            console.error(`🚨 CRITICAL: Missing essential data for user_id: ${userId}`, {
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
              full_profile: profile
            });
          } else {
            // Log successful profile data for comparison
            console.log(`✅ Good profile data for ${userId}:`, {
              name: `${profile.first_name} ${profile.last_name}`,
              email: profile.email
            });
          }
          
          return {
            user_id: userId,
            // Essential data - if missing, it's a BUG, not missing data
            first_name: profile?.first_name || (() => {
              console.error(`🚨 FALLBACK: Using "Nome non disponibile" for user_id: ${userId}`);
              return 'Nome non disponibile';
            })(),
            last_name: profile?.last_name || (() => {
              console.error(`🚨 FALLBACK: Using "Cognome non disponibile" for user_id: ${userId}`);
              return 'Cognome non disponibile';
            })(),
            email: profile?.email || (() => {
              console.error(`🚨 FALLBACK: Using "Email non disponibile" for user_id: ${userId}`);
              return 'Email non disponibile';
            })(),
            phone: profile?.phone || null,
            fiscal_code: profile?.fiscal_code || '', // Only optional field with smart default
            profile_picture_url: profile?.profile_picture_url || null,
            membership_status: membershipByUser.get(userId)?.status ?? 'unknown',
            membership_type: membershipByUser.get(userId)?.membership_type ?? 'member',
            user_roles: rolesByUser.get(userId) || ['basic_user'],
            is_instructor: instructorUserIds.has(userId),
            medical_expiry_date: cert?.expiry_date ?? null,
            medical_file_path: cert?.file_path ?? null,
            belt: profile?.belt ?? null,
          } as MemberProfile;
        });

        // Final validation check for BUG detection
        const errorProfiles = combined.filter(m => 
          m.first_name === '❌ ERRORE CARICAMENTO' || 
          m.last_name === '❌ ERRORE CARICAMENTO' ||
          m.email === '❌ ERRORE CARICAMENTO'
        );

        console.log('✅ Members loaded successfully:', {
          totalMembers: combined.length,
          activeMembers: combined.filter(m => m.membership_status === 'active').length,
          instructors: combined.filter(m => m.is_instructor).length,
          errorProfiles: errorProfiles.length,
          errorProfileUserIds: errorProfiles.map(m => m.user_id),
          isMobile,
          deviceInfo: { userAgent: navigator.userAgent, screen: { width: window.innerWidth, height: window.innerHeight } },
          sample: combined.slice(0, 3).map(m => ({ 
            name: `${m.first_name} ${m.last_name}`, 
            email: m.email,
            status: m.membership_status,
            isInstructor: m.is_instructor 
          }))
        });

        setMembers(combined as MemberProfile[]);
        
        // Mobile-specific validation
        if (isMobile) {
          console.log('📱 MOBILE DEBUG - Final member count after setState:', combined.length);
          console.log('📱 MOBILE DEBUG - First 3 members:', combined.slice(0, 3).map(m => ({
            name: `${m.first_name} ${m.last_name}`,
            email: m.email,
            status: m.membership_status
          })));
        }
      } catch (e: any) {
        console.error('❌ loadMembers error:', e);
        if (isMobile) {
          console.error('📱 MOBILE ERROR:', {
            error: e.message,
            stack: e.stack,
            selectedGym: selectedGym?.id,
            timestamp: new Date().toISOString()
          });
        }
        toast({ title: 'Errore caricamento utenti', description: e?.message ?? 'Qualcosa è andato storto', variant: 'destructive' });
        setMembers([]); // Ensure we clear members on error
      } finally {
        setLoading(false);
        if (isMobile) {
          console.log('📱 MOBILE DEBUG - loadMembers completed, loading set to false');
        }
      }
    };

  useEffect(() => {
    // Add a small delay to ensure gym context is fully loaded
    const timer = setTimeout(() => {
      if (isMobile) {
        console.log('📱 MOBILE DEBUG - useEffect triggered loadMembers:', {
          selectedGymId: selectedGym?.id,
          selectedGymName: selectedGym?.name,
          currentMembersCount: members.length,
          timestamp: new Date().toISOString()
        });
      }
      loadMembers();
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedGym?.id, toast]);

  // Debug effect to track members state changes on mobile
  useEffect(() => {
    if (isMobile) {
      console.log('📱 MOBILE DEBUG - members state changed:', {
        count: members.length,
        hasData: members.length > 0,
        firstMember: members.length > 0 ? `${members[0].first_name} ${members[0].last_name}` : 'none',
        loading,
        selectedGym: selectedGym?.name,
        timestamp: new Date().toISOString()
      });
    }
  }, [members, isMobile, loading, selectedGym?.name]);

  // Load credits when members are loaded
  useEffect(() => {
    if (members.length > 0 && selectedGym?.id) {
      loadUserCredits();
    }
  }, [members, selectedGym?.id]);

  // Helper function to get the highest priority role
  const getHighestRole = (roles: string[]) => {
    if (roles.includes('admin')) return { role: 'admin', label: 'Admin', icon: Crown, variant: 'destructive' as const };
    if (roles.includes('gym_owner')) return { role: 'gym_owner', label: 'Proprietario', icon: Shield, variant: 'default' as const };
    if (roles.includes('instructor')) return { role: 'instructor', label: 'Istruttore', icon: UserCheck, variant: 'secondary' as const };
    return { role: 'basic_user', label: 'Membro', icon: Users, variant: 'outline' as const };
  };

  const reloadMembers = async () => {
    if (!selectedGym?.id) return;
    console.log('🔄 Manual reload triggered');
    await loadMembers();
    await loadUserCredits();
  };

  // Load user credits for the selected gym
  const loadUserCredits = async () => {
    if (!selectedGym?.id || members.length === 0) return;
    
    try {
      const userIds = members.map(m => m.user_id);
      const { data: credits, error } = await supabase
        .from('gym_credits')
        .select('user_id, credits')
        .eq('gym_id', selectedGym.id)
        .in('user_id', userIds);
      
      if (error) throw error;
      
      const creditsMap = new Map<string, number>();
      credits?.forEach(c => creditsMap.set(c.user_id, c.credits || 0));
      
      // Set 0 credits for users not in the gym_credits table
      userIds.forEach(userId => {
        if (!creditsMap.has(userId)) {
          creditsMap.set(userId, 0);
        }
      });
      
      setUserCredits(creditsMap);
    } catch (error) {
      console.error('Error loading user credits:', error);
    }
  };

  const forceCacheRefresh = async () => {
    if (!selectedGym?.id) return;
    console.log('🚀 Force cache refresh triggered');
    await loadMembers(true);
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

  // Calculate statistics
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.membership_status === 'active').length;
  const inactiveMembers = totalMembers - activeMembers;
  const instructors = members.filter(m => m.is_instructor).length;
  const normalUsers = totalMembers - instructors;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredByStatus = showInactive ? members : members.filter((m) => m.membership_status === 'active');
  
  // Filter by medical certificate if toggle is enabled
  const filteredByCertificate = showOnlyWithoutCert 
    ? filteredByStatus.filter((m) => {
        // Consider no certificate or expired certificate as "without certificate"
        if (!m.medical_expiry_date) return true;
        const now = new Date();
        const expiryDate = new Date(m.medical_expiry_date);
        return expiryDate < now; // Expired certificate
      })
    : filteredByStatus;
  
  const listToShow = normalizedQuery
    ? filteredByCertificate.filter((m) => `${m.first_name} ${m.last_name}`.toLowerCase().includes(normalizedQuery))
    : filteredByCertificate;
    
  // Calculate members without valid certificate
  const membersWithoutCert = members.filter((m) => {
    if (!m.medical_expiry_date) return true;
    const now = new Date();
    const expiryDate = new Date(m.medical_expiry_date);
    return expiryDate < now;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Utenti della Palestra
        </h1>
        <p className="text-muted-foreground">Gestisci i membri della tua palestra</p>
      </div>

      <OwnerUserStats
        totalMembers={totalMembers}
        activeMembers={activeMembers}
        inactiveMembers={inactiveMembers}
        normalUsers={normalUsers}
        instructors={instructors}
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Elenco Membri</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reloadMembers} disabled={loading}>
                🔄 Aggiorna
              </Button>
              <Button variant="outline" onClick={forceCacheRefresh} disabled={loading} className="text-primary">
                🚀 {isMobile ? 'Cache' : 'Ricarica Cache'}
              </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Cerca per nome o cognome..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <Switch id="show-inactive" checked={showInactive} onCheckedChange={(v) => setShowInactive(!!v)} />
                <Label htmlFor="show-inactive">Mostra inattivi</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-without-cert" checked={showOnlyWithoutCert} onCheckedChange={(v) => setShowOnlyWithoutCert(!!v)} />
                <Label htmlFor="show-without-cert">Solo senza certificato ({membersWithoutCert})</Label>
              </div>
            </div>
          </div>
          
          <TooltipProvider>
            {isMobile ? (
              // Mobile Card Layout
              <div className="space-y-4">
                {loading ? (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-muted-foreground">Caricamento...</p>
                    </CardContent>
                  </Card>
                 ) : listToShow.length === 0 ? (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <p className="text-muted-foreground">
                        {members.length === 0
                          ? 'Nessun membro nella palestra.'
                          : 'Nessun risultato per la ricerca.'}
                      </p>
                      {isMobile && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <div>📱 DEBUG MOBILE:</div>
                          <div>• Palestra: {selectedGym?.name || 'Non selezionata'}</div>
                          <div>• Membri totali: {members.length}</div>
                          <div>• Filtrati: {listToShow.length}</div>
                          <div>• Query: "{query}"</div>
                          <div>• Ora: {new Date().toLocaleTimeString()}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                 ) : (
                  listToShow.map((m) => {
                    const roleInfo = getHighestRole(m.user_roles);
                    const RoleIcon = roleInfo.icon;
                    const isAdminOrOwner = m.user_roles.includes('admin') || m.user_roles.includes('gym_owner');
                    const expiryLabel = m.medical_expiry_date
                      ? new Date(m.medical_expiry_date).toLocaleDateString('it-IT')
                      : 'N/D';
                    
                    return (
                      <Card key={m.user_id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{m.first_name} {m.last_name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{m.email || 'N/D'}</p>
                            </div>
                            <Badge variant={m.membership_status === 'active' ? 'default' : 'secondary'}>
                              {m.membership_status === 'active' ? 'Attivo' : 'Inattivo'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium">Telefono:</span>
                              <div className="text-muted-foreground">
                                {m.phone || 'N/D'}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Codice Fiscale:</span>
                              <div className="text-muted-foreground">
                                {m.fiscal_code || 'N/D'}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Ruolo:</span>
                              <div className="mt-1">
                                <Badge variant={roleInfo.variant} className="flex items-center gap-1 w-fit">
                                  <RoleIcon className="h-3 w-3" />
                                  {roleInfo.label}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Cintura:</span>
                              <div className="text-muted-foreground">
                                {m.belt || 'N/D'}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Crediti:</span>
                              <div className="text-muted-foreground font-semibold">
                                {userCredits.get(m.user_id) || 0}
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <span className="font-medium text-sm">Certificato:</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{expiryLabel}</span>
                              {m.medical_file_path && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => viewCertificate(m.medical_file_path)}
                                >
                                  <FileText className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUserForDetails(m.user_id);
                                setUserDetailsModalOpen(true);
                              }}
                              className="flex-1"
                            >
                              <Eye className="mr-2 h-3 w-3" />
                              Dettagli
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUserForCredits(m);
                                setCreditDialogOpen(true);
                              }}
                              title="Gestisci crediti"
                            >
                              <CreditCard className="h-3 w-3" />
                            </Button>
                            {!isAdminOrOwner && !m.is_instructor && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handlePromoteClick(m.user_id)}
                                disabled={promoting === m.user_id}
                              >
                                <UserCheck className="h-3 w-3" />
                              </Button>
                            )}
                            {m.is_instructor && !isAdminOrOwner && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => demoteInstructor(m.user_id)}
                                disabled={demoting === m.user_id}
                              >
                                <UserMinus className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAuthUserId(m.user_id);
                                setUploadDialogOpen(true);
                              }}
                            >
                              <FileText className="h-3 w-3" />
                            </Button>
                            {!isAdminOrOwner && (
                              <DeleteUserConfirmDialog
                                userEmail={m.email || ''}
                                userName={`${m.first_name} ${m.last_name}`}
                                userId={m.user_id}
                                gymId={selectedGym?.id}
                                onUserDeleted={() => reloadMembers()}
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            ) : (
              // Desktop Table Layout
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Codice Fiscale</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Cintura</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Certificato</TableHead>
                    <TableHead>Azione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9}>Caricamento...</TableCell>
                    </TableRow>
                  ) : listToShow.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
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
                          <TableCell className="text-muted-foreground">
                            {m.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {m.phone}
                              </div>
                            ) : 'N/D'}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {m.fiscal_code ? (
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                {m.fiscal_code}
                              </div>
                            ) : 'N/D'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={roleInfo.variant} className="flex items-center gap-1 w-fit">
                              <RoleIcon className="h-3 w-3" />
                              {roleInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {m.belt ? (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                🥋 {m.belt}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Nessuna</span>
                            )}
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => viewCertificate(m.medical_file_path)}
                                      className="h-6 px-2"
                                    >
                                      <FileText className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Visualizza certificato</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 px-2"
                                     onClick={() => {
                                       setSelectedUserForCredits(m);
                                       setCreditDialogOpen(true);
                                     }}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Aggiungi crediti</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUserForDetails(m.user_id);
                                  setUserDetailsModalOpen(true);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Dettagli
                              </Button>
                              {isAdminOrOwner ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center text-muted-foreground">
                                      <Shield className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Non puoi modificare admin o proprietari</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : m.is_instructor ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={demoting === m.user_id}
                                    >
                                      {demoting === m.user_id ? (
                                        <>
                                          <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                          ...
                                        </>
                                      ) : (
                                        <>
                                          <UserMinus className="h-3 w-3 mr-1" />
                                          Rimuovi Istruttore
                                        </>
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Rimuovere Istruttore</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Sei sicuro di voler rimuovere {m.first_name} {m.last_name} dal ruolo di istruttore?
                                        Diventerà un membro normale della palestra.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => demoteInstructor(m.user_id)}>
                                        Conferma Rimozione
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePromoteClick(m.user_id)}
                                  disabled={promoting === m.user_id}
                                >
                                  {promoting === m.user_id ? (
                                    <>
                                      <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                      ...
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Promuovi Istruttore
                                    </>
                                  )}
                                 </Button>
                               )}
                               {!isAdminOrOwner && (
                                  <DeleteUserConfirmDialog
                                    userEmail={m.email || ''}
                                    userName={`${m.first_name} ${m.last_name}`}
                                    userId={m.user_id}
                                    gymId={selectedGym?.id}
                                    onUserDeleted={() => reloadMembers()}
                                  />
                               )}
                             </div>
                           </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Promote Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promuovi a Istruttore</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Biografia dell'istruttore (opzionale)</Label>
              <Textarea
                id="bio"
                placeholder="Scrivi una breve biografia per l'istruttore..."
                value={instructorBio}
                onChange={(e) => setInstructorBio(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={promoteToInstructor} disabled={promoting !== null}>
              {promoting ? 'Promozione...' : 'Promuovi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={userDetailsModalOpen}
        onClose={() => {
          setUserDetailsModalOpen(false);
          setSelectedUserForDetails(null);
        }}
        userId={selectedUserForDetails}
      />

      {/* Manual Credit Assignment Dialog */}
      {selectedUserForCredits && selectedGym && (
        <ManualCreditAssignmentDialog
          open={creditDialogOpen}
          onOpenChange={setCreditDialogOpen}
          userId={selectedUserForCredits.user_id}
          userName={`${selectedUserForCredits.first_name} ${selectedUserForCredits.last_name}`}
          gymId={selectedGym.id}
          onSuccess={() => {
            loadMembers();
            loadUserCredits();
            setCreditDialogOpen(false);
            setSelectedUserForCredits(null);
          }}
        />
      )}

      {/* Medical Certificate Upload Dialog */}
      <MedicalCertificateUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploaded={() => {
          loadMembers();
          setUploadDialogOpen(false);
        }}
      />
    </div>
  );
};

export default OwnerUsers;