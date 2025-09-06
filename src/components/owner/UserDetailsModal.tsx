import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  FileText, 
  Shield, 
  Heart, 
  Users,
  Crown,
  UserCheck,
  CreditCard,
  Image
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOwnerGym } from '@/contexts/OwnerGymContext';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

interface FullUserProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  email: string;
  phone?: string;
  fiscal_code?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  bio?: string;
  profile_picture_url?: string;
  belt?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  current_credits?: number;
  created_at: string;
  updated_at: string;
  membership_status: string;
  membership_type: string;
  user_roles: string[];
  is_instructor: boolean;
  medical_expiry_date?: string | null;
  medical_file_path?: string | null;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, userId }) => {
  const { selectedGym } = useOwnerGym();
  const [userDetails, setUserDetails] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && userId) {
      loadUserDetails();
    }
  }, [isOpen, userId]);

  const loadUserDetails = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      if (!selectedGym?.id) {
        console.log('❌ No selected gym available');
        return;
      }

      // Get full profile data
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileErr) throw profileErr;

      // Get membership data
      const { data: membership, error: membershipErr } = await supabase
        .from('user_gym_memberships')
        .select('status, membership_type')
        .eq('user_id', userId)
        .eq('gym_id', selectedGym.id)
        .single();
      
      if (membershipErr) throw membershipErr;

      // Get user roles
      const { data: userRoles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (rolesErr) throw rolesErr;

      // Get instructor status
      const { data: instructor, error: instructorErr } = await supabase
        .from('instructors')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('gym_id', selectedGym.id)
        .maybeSingle();
      
      if (instructorErr) throw instructorErr;

      // Get latest medical certificate
      const { data: cert, error: certErr } = await supabase
        .from('medical_certificates')
        .select('expiry_date, file_path')
        .eq('user_id', userId)
        .eq('gym_id', selectedGym.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (certErr) throw certErr;

      const fullProfile: FullUserProfile = {
        ...profile,
        membership_status: membership?.status || 'inactive',
        membership_type: membership?.membership_type || 'member',
        user_roles: userRoles?.map(ur => ur.role) || ['basic_user'],
        is_instructor: !!instructor,
        medical_expiry_date: cert?.expiry_date || null,
        medical_file_path: cert?.file_path || null,
      };

      setUserDetails(fullProfile);
    } catch (e: any) {
      console.error('Error loading user details:', e);
      toast({ 
        title: 'Errore', 
        description: 'Impossibile caricare i dettagli utente', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

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

  const getRoleInfo = (roles: string[]) => {
    if (roles.includes('admin')) return { role: 'admin', label: 'Admin', icon: Crown, variant: 'destructive' as const };
    if (roles.includes('gym_owner')) return { role: 'gym_owner', label: 'Proprietario', icon: Shield, variant: 'default' as const };
    if (roles.includes('instructor')) return { role: 'instructor', label: 'Istruttore', icon: UserCheck, variant: 'secondary' as const };
    return { role: 'basic_user', label: 'Membro', icon: Users, variant: 'outline' as const };
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/D';
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (!userDetails && !loading) return null;

  const roleInfo = userDetails ? getRoleInfo(userDetails.user_roles) : null;
  const RoleIcon = roleInfo?.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            Dettagli Utente Completi
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Caricamento dettagli...</p>
              </div>
            </div>
          ) : userDetails && (
            <div className="space-y-6 p-1">
              {/* Header con Avatar e Info Base */}
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={userDetails.profile_picture_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {userDetails.first_name?.[0]}{userDetails.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div>
                        <h3 className="text-2xl font-bold">
                          {userDetails.first_name} {userDetails.last_name}
                        </h3>
                        {userDetails.nickname && (
                          <p className="text-muted-foreground">"{userDetails.nickname}"</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {roleInfo && RoleIcon && (
                          <Badge variant={roleInfo.variant} className="flex items-center gap-1">
                            <RoleIcon className="h-3 w-3" />
                            {roleInfo.label}
                          </Badge>
                        )}
                        <Badge variant={userDetails.membership_status === 'active' ? 'default' : 'secondary'}>
                          {userDetails.membership_status === 'active' ? 'Attivo' : 'Inattivo'}
                        </Badge>
                        {userDetails.belt && (
                          <Badge variant="outline">
                            🥋 {userDetails.belt}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informazioni Personali */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Informazioni Personali
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-2 font-medium mb-1">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          Email
                        </div>
                        <p className="text-muted-foreground">{userDetails.email || 'N/D'}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-medium mb-1">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          Telefono
                        </div>
                        <p className="text-muted-foreground">{userDetails.phone || 'N/D'}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-medium mb-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Data di Nascita
                        </div>
                        <p className="text-muted-foreground">{formatDate(userDetails.birth_date)}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-medium mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Genere
                        </div>
                        <p className="text-muted-foreground">{userDetails.gender || 'N/D'}</p>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 font-medium mb-1">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          Codice Fiscale
                        </div>
                        <p className="text-muted-foreground font-mono">{userDetails.fiscal_code || 'N/D'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informazioni di Contatto */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Informazioni di Contatto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="font-medium mb-1">Indirizzo</div>
                        <p className="text-muted-foreground">{userDetails.address || 'N/D'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="font-medium mb-1">Città</div>
                          <p className="text-muted-foreground">{userDetails.city || 'N/D'}</p>
                        </div>
                        <div>
                          <div className="font-medium mb-1">CAP</div>
                          <p className="text-muted-foreground">{userDetails.postal_code || 'N/D'}</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 font-medium mb-1">
                          <Heart className="h-4 w-4 text-muted-foreground" />
                          Contatto di Emergenza
                        </div>
                        <p className="text-muted-foreground">{userDetails.emergency_contact_name || 'N/D'}</p>
                        {userDetails.emergency_contact_phone && (
                          <p className="text-muted-foreground text-xs">{userDetails.emergency_contact_phone}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informazioni Palestra */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Informazioni Palestra
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="font-medium mb-1">Crediti Attuali</div>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {userDetails.current_credits || 0} crediti
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Tipo Membership</div>
                        <p className="text-muted-foreground capitalize">{userDetails.membership_type}</p>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Registrato dal</div>
                        <p className="text-muted-foreground">{formatDate(userDetails.created_at)}</p>
                      </div>
                      {userDetails.bio && (
                        <div>
                          <div className="font-medium mb-1">Biografia</div>
                          <p className="text-muted-foreground text-xs bg-muted p-2 rounded">{userDetails.bio}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Certificato Medico */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Certificato Medico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium mb-1">Scadenza</div>
                        <Badge variant={userDetails.medical_expiry_date ? 'outline' : 'secondary'}>
                          {userDetails.medical_expiry_date 
                            ? formatDate(userDetails.medical_expiry_date)
                            : 'Nessun certificato'
                          }
                        </Badge>
                      </div>
                      {userDetails.medical_file_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewCertificate(userDetails.medical_file_path)}
                          className="w-full"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Visualizza Certificato
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;