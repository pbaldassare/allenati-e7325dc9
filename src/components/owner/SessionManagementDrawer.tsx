import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  UserPlus, 
  Search, 
  X, 
  Clock, 
  MapPin, 
  UserMinus,
  Calendar,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { CancelSessionDialog } from '@/components/dialogs/CancelSessionDialog';
import { processRefund, getUserRole } from '@/lib/creditRefundHelpers';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';
import { MedicalCertificateStatusBadge } from './MedicalCertificateStatusBadge';
import ManualSubscriptionActivationDialog from '@/components/dialogs/ManualSubscriptionActivationDialog';

interface SessionData {
  id: string;
  course_id: string;
  course_name: string;
  course_description?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_name?: string;
  max_participants: number;
  available_spots: number;
  participant_count: number;
}

interface Participant {
  id: string;
  user_id: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
    current_credits: number;
  };
  status: string;
  credits_used: number;
  subscription?: {
    id: string;
    expires_at: string;
    status: string;
    subscription_plans: {
      name: string;
      unlimited_access: boolean;
    };
  } | null;
  medical_certificate?: {
    id: string;
    expiry_date: string;
    status: string;
  } | null;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_credits: number;
  profile_picture_url?: string;
}

interface SessionManagementDrawerProps {
  session: SessionData;
  onSessionUpdate?: () => void;
  children: React.ReactNode;
}

export const SessionManagementDrawer: React.FC<SessionManagementDrawerProps> = ({
  session,
  onSessionUpdate,
  children
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingSession, setCancellingSession] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedUserForSubscription, setSelectedUserForSubscription] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    if (open) {
      loadParticipants();
    }
  }, [open, session.id]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          status,
          credits_used,
          profiles!inner(
            user_id,
            first_name,
            last_name,
            email,
            profile_picture_url,
            current_credits
          )
        `)
        .eq('session_id', session.id)
        .eq('status', 'confirmed');

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        setParticipants([]);
        return;
      }

      // Get user IDs for additional queries
      const userIds = bookings.map(b => b.user_id);

      // Get subscriptions for these users
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          id,
          expires_at,
          status,
          subscription_plans!inner(
            name,
            unlimited_access
          )
        `)
        .in('user_id', userIds)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      // Get medical certificates for these users
      const { data: certificates } = await supabase
        .from('medical_certificates')
        .select('user_id, id, expiry_date, status')
        .in('user_id', userIds)
        .eq('status', 'approved')
        .gt('expiry_date', new Date().toISOString());

      // Create maps for quick lookup
      const subscriptionMap = new Map(
        subscriptions?.map(sub => [sub.user_id, sub]) || []
      );
      const certificateMap = new Map(
        certificates?.map(cert => [cert.user_id, cert]) || []
      );

      const participantsList = bookings.map(booking => ({
        id: booking.id,
        user_id: booking.user_id,
        status: booking.status,
        credits_used: booking.credits_used,
        user: {
          first_name: booking.profiles.first_name || '',
          last_name: booking.profiles.last_name || '',
          email: booking.profiles.email || '',
          profile_picture_url: booking.profiles.profile_picture_url,
          current_credits: booking.profiles.current_credits || 0
        },
        subscription: subscriptionMap.get(booking.user_id) || null,
        medical_certificate: certificateMap.get(booking.user_id) || null
      }));

      setParticipants(participantsList);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast.error('Errore nel caricamento partecipanti');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, current_credits, profile_picture_url')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(8);

      if (error) throw error;

      const users = data?.map(profile => ({
        id: profile.user_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        current_credits: profile.current_credits || 0,
        profile_picture_url: profile.profile_picture_url
      })) || [];

      // Filter out already enrolled users
      const enrolledUserIds = participants.map(p => p.user_id);
      const availableUsers = users.filter(u => !enrolledUserIds.includes(u.id));

      setSearchResults(availableUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Errore nella ricerca utenti');
    }
  };

  const enrollUser = async (userId: string) => {
    setEnrolling(userId);
    try {
      const { error } = await supabase.rpc('manual_enroll_user', {
        _user_id: userId,
        _session_id: session.id,
        _enrolled_by: user?.id
      });

      if (error) throw error;

      toast.success('Utente iscritto con successo!');
      await loadParticipants();
      setSearchTerm('');
      setSearchResults([]);
      onSessionUpdate?.();
    } catch (error: any) {
      console.error('Error enrolling user:', error);
      toast.error(error.message || 'Errore nell\'iscrizione');
    } finally {
      setEnrolling(null);
    }
  };

  const removeParticipant = async (bookingId: string) => {
    setRemoving(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Rimosso dallo staff',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Partecipante rimosso con successo!');
      await loadParticipants();
      onSessionUpdate?.();
    } catch (error) {
      console.error('Error removing participant:', error);
      toast.error('Errore nella rimozione partecipante');
    } finally {
      setRemoving(null);
    }
  };

  const cancelSession = async (reason?: string) => {
    if (!user?.id) return;

    setCancellingSession(true);
    try {
      // Get user role for refund processing
      const userRole = await getUserRole(user.id);

      // Update session status to cancelled
      const { error: sessionError } = await supabase
        .from('course_sessions')
        .update({ 
          status: 'cancelled',
          notes: reason ? `Cancellata: ${reason}` : 'Sessione cancellata'
        })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      // Get all confirmed bookings for this session
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          courses(id, name, gym_id, deadline_hours)
        `)
        .eq('session_id', session.id)
        .eq('status', 'confirmed');

      if (bookingsError) throw bookingsError;

      let refundedCount = 0;
      let refundErrors = 0;

      // Process each booking cancellation and refund
      for (const booking of bookings || []) {
        try {
          // Update booking status
          const { error: updateError } = await supabase
            .from('bookings')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: reason ? `Sessione cancellata: ${reason}` : 'Sessione cancellata'
            })
            .eq('id', booking.id);

          if (updateError) throw updateError;

          // Process refund
          const refundResult = await processRefund(booking, user.id, userRole, reason);
          if (refundResult.success) {
            refundedCount++;
          } else {
            refundErrors++;
            console.error('Refund failed for booking:', booking.id, refundResult.message);
          }
        } catch (error) {
          console.error('Error processing booking cancellation:', booking.id, error);
          refundErrors++;
        }
      }

      // Show success message
      const totalBookings = bookings?.length || 0;
      if (totalBookings > 0) {
        const refundMessage = refundedCount > 0 
          ? ` ${refundedCount} partecipanti rimborsati.`
          : '';
        const errorMessage = refundErrors > 0 
          ? ` ${refundErrors} errori nei rimborsi.`
          : '';
        
        toast.success(`Sessione cancellata con successo.${refundMessage}${errorMessage}`);
      } else {
        toast.success('Sessione cancellata con successo.');
      }

      // Close dialogs and refresh
      setCancelDialogOpen(false);
      setOpen(false);
      onSessionUpdate?.();

    } catch (error) {
      console.error('Error cancelling session:', error);
      toast.error('Errore durante la cancellazione della sessione');
    } finally {
      setCancellingSession(false);
    }
  };

  const formatDateTime = (date: string, startTime: string, endTime: string) => {
    const sessionDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateStr = sessionDate.toLocaleDateString('it-IT');
    if (sessionDate.toDateString() === today.toDateString()) {
      dateStr = 'Oggi';
    } else if (sessionDate.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Domani';
    }
    
    return `${dateStr} ${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
  };

  const handleSubscriptionBadgeClick = (participant: Participant) => {
    // Only handle click if user has no subscription
    if (!participant.subscription) {
      setSelectedUserForSubscription({
        id: participant.user_id,
        name: `${participant.user.first_name} ${participant.user.last_name}`,
        email: participant.user.email
      });
      setSubscriptionDialogOpen(true);
    }
  };

  const handleSubscriptionActivated = () => {
    loadParticipants(); // Reload participants to see updated subscription status
    setSelectedUserForSubscription(null);
  };

  const occupancyRate = ((session.max_participants - session.available_spots) / session.max_participants) * 100;
  const isAlmostFull = session.available_spots <= 3 && session.available_spots > 0;
  const isFull = session.available_spots <= 0;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{session.course_name}</h3>
              {session.course_description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {session.course_description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDateTime(session.session_date, session.start_time, session.end_time)}
                </span>
                {session.room_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {session.room_name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Badge variant={isFull ? "destructive" : isAlmostFull ? "secondary" : "default"}>
                    {participants.length}/{session.max_participants} posti
                  </Badge>
                  {isFull && <AlertCircle className="h-4 w-4 text-destructive" />}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {occupancyRate.toFixed(0)}% occupato
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Cancella
              </Button>
            </div>
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Search Section */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca utenti da iscrivere..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchResults([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 bg-background rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profile_picture_url} />
                        <AvatarFallback className="text-xs">
                          {user.first_name[0]}{user.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {user.current_credits} crediti
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => enrollUser(user.id)}
                        disabled={enrolling === user.id || isFull}
                      >
                        {enrolling === user.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Participants List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Partecipanti Iscritti ({participants.length})
              </h4>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Caricamento partecipanti...
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun partecipante iscritto
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <Card key={participant.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={participant.user.profile_picture_url} />
                            <AvatarFallback>
                              {participant.user.first_name[0]}{participant.user.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {participant.user.first_name} {participant.user.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {participant.user.email}
                            </p>
                            <div className="space-y-2 mt-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {participant.user.current_credits} crediti
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {participant.status}
                                </Badge>
                              </div>
                              
                              <div className="flex flex-col gap-1">
                                <SubscriptionStatusBadge 
                                  subscription={participant.subscription} 
                                  onClick={!participant.subscription ? () => handleSubscriptionBadgeClick(participant) : undefined}
                                  isClickable={!participant.subscription}
                                />
                                <MedicalCertificateStatusBadge certificate={participant.medical_certificate} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeParticipant(participant.id)}
                          disabled={removing === participant.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {removing === participant.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>

      <CancelSessionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        session={{
          id: session.id,
          course_name: session.course_name,
          session_date: session.session_date,
          start_time: session.start_time,
          end_time: session.end_time,
          room_name: session.room_name,
          participant_count: participants.length
        }}
        onConfirm={cancelSession}
        isLoading={cancellingSession}
      />

      <ManualSubscriptionActivationDialog
        isOpen={subscriptionDialogOpen}
        onClose={() => {
          setSubscriptionDialogOpen(false);
          setSelectedUserForSubscription(null);
        }}
        onActivated={handleSubscriptionActivated}
        preselectedUserId={selectedUserForSubscription?.id}
      />
    </Drawer>
  );
};