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
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
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
  status?: string;
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [toggleVisibilityLoading, setToggleVisibilityLoading] = useState(false);
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
    
    const startTime = Date.now();
    console.log('🚀 [UNIFIED] Starting unified participants query:', {
      sessionId: session.id,
      isMobile,
      timestamp: new Date().toISOString()
    });

    try {
      // Simplified unified query - get bookings with profiles in one go
      const { data: participantsData, error: unifiedError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          status,
          credits_used,
          created_at,
          profiles!inner (
            user_id,
            first_name,
            last_name,
            email,
            profile_picture_url,
            current_credits
          )
        `)
        .eq('status', 'confirmed')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      const queryTime = Date.now() - startTime;
      
      console.log('✅ [UNIFIED] Query completed:', {
        success: !unifiedError,
        queryTimeMs: queryTime,
        dataCount: participantsData?.length || 0,
        error: unifiedError,
        sessionId: session.id,
        isMobile
      });

      if (unifiedError) {
        console.error('❌ [UNIFIED] Query failed, trying fallback:', unifiedError);
        
        // Fallback: Simple query approach
        const { data: simpleBookings, error: fallbackError } = await supabase
          .from('bookings')
          .select('id, user_id, status, credits_used, created_at')
          .eq('status', 'confirmed')
          .eq('session_id', session.id);
        
        if (fallbackError) {
          throw new Error(`Unified query failed: ${unifiedError.message}. Fallback failed: ${fallbackError.message}`);
        }

        if (!simpleBookings || simpleBookings.length === 0) {
          console.log('ℹ️ [FALLBACK] No bookings found');
          setParticipants([]);
          return;
        }

        // Get profiles separately for fallback
        const userIds = simpleBookings.map(b => b.user_id);
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, current_credits')
          .in('user_id', userIds);

        const fallbackParticipants: Participant[] = simpleBookings.map(booking => {
          const profile = fallbackProfiles?.find(p => p.user_id === booking.user_id);
          return {
            id: booking.id,
            user_id: booking.user_id,
            status: booking.status,
            credits_used: booking.credits_used,
            user: profile ? {
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
              profile_picture_url: null,
              current_credits: profile.current_credits
            } : {
              first_name: 'Utente',
              last_name: 'Sconosciuto',
              email: 'N/A',
              profile_picture_url: null,
              current_credits: 0
            },
            subscription: null,
            medical_certificate: null
          };
        });

        console.log('🔄 [FALLBACK] Using fallback participants:', {
          count: fallbackParticipants.length,
          isMobile
        });

        setParticipants(fallbackParticipants);
        return;
      }

      if (!participantsData || participantsData.length === 0) {
        console.log('ℹ️ [UNIFIED] No participants found');
        setParticipants([]);
        return;
      }

      // Get user IDs for additional data
      const userIds = participantsData.map(booking => booking.user_id);
      
      // Fetch subscriptions, certificates and gym credits separately for reliability
      const [subscriptionsResult, certificatesResult, gymCreditsResult] = await Promise.all([
        supabase
          .from('user_subscriptions')
          .select(`
            user_id,
            id,
            status,
            expires_at,
            subscription_plans!inner(
              name,
              unlimited_access
            )
          `)
          .in('user_id', userIds)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString()),
        
        supabase
          .from('medical_certificates')
          .select('user_id, id, status, expiry_date')
          .in('user_id', userIds)
          .eq('status', 'approved')
          .gt('expiry_date', new Date().toISOString()),
          
        supabase
          .from('gym_credits')
          .select('user_id, credits')
          .in('user_id', userIds)
      ]);

      const subscriptions = subscriptionsResult.data || [];
      const certificates = certificatesResult.data || [];
      const gymCredits = gymCreditsResult.data || [];

      // Transform data efficiently
      const participants: Participant[] = participantsData.map(booking => {
        const profile = booking.profiles;
        const subscription = subscriptions.find(sub => sub.user_id === booking.user_id);
        const certificate = certificates.find(cert => cert.user_id === booking.user_id);
        const userGymCredits = gymCredits.find(gc => gc.user_id === booking.user_id);

        return {
          id: booking.id,
          user_id: booking.user_id,
          status: booking.status,
          credits_used: booking.credits_used,
          user: {
            first_name: profile?.first_name || 'Utente',
            last_name: profile?.last_name || 'Sconosciuto',
            email: profile?.email || 'N/A',
            profile_picture_url: profile?.profile_picture_url,
            current_credits: userGymCredits?.credits || 0 // Use gym-specific credits
          },
          subscription: subscription ? {
            id: subscription.id,
            status: subscription.status,
            expires_at: subscription.expires_at,
            subscription_plans: subscription.subscription_plans
          } : null,
          medical_certificate: certificate ? {
            id: certificate.id,
            status: certificate.status,
            expiry_date: certificate.expiry_date
          } : null
        };
      });

      const totalTime = Date.now() - startTime;
      console.log('🎉 [UNIFIED] Participants loaded successfully:', {
        count: participants.length,
        totalTimeMs: totalTime,
        isMobile,
        withProfiles: participants.filter(p => p.user.first_name !== 'Utente').length,
        withSubscriptions: participants.filter(p => p.subscription).length,
        withCertificates: participants.filter(p => p.medical_certificate).length
      });

      setParticipants(participants);
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('💥 [UNIFIED] Critical error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        totalTimeMs: totalTime,
        sessionId: session.id,
        isMobile
      });

      // Emergency fallback for mobile: show basic structure to confirm UI works
      if (isMobile) {
        console.log('🆘 [EMERGENCY] Using emergency mock for mobile debug');
        setParticipants([{
          id: 'emergency-' + Date.now(),
          user_id: 'emergency-user',
          status: 'confirmed',
          credits_used: 1,
          user: {
            first_name: 'Test',
            last_name: 'Emergency',
            email: 'emergency@test.com',
            profile_picture_url: null,
            current_credits: 5
          },
          subscription: null,
          medical_certificate: null
        }]);
        toast.error('Errore caricamento partecipanti (modalità debug attiva)');
      } else {
        toast.error('Errore nel caricamento partecipanti');
      }
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      // First get profiles, then get gym-specific credits
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, profile_picture_url')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(8);

      if (error) throw error;

      // Get gym-specific credits for each user
      const users = await Promise.all(
        (data || []).map(async (profile) => {
          // Get gym-specific credits - we'd need gym context here
          const { data: gymCredits } = await supabase
            .from('gym_credits')
            .select('credits')
            .eq('user_id', profile.user_id)
            .maybeSingle();
          
          return {
            id: profile.user_id,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || '',
            current_credits: gymCredits?.credits || 0,
            profile_picture_url: profile.profile_picture_url
          };
        })
      );

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

  const toggleSessionVisibility = async () => {
    setToggleVisibilityLoading(true);
    try {
      const newStatus = session.status === 'hidden' ? 'scheduled' : 'hidden';
      
      console.log('🔄 Toggling session visibility:', {
        session_id: session.id,
        current_status: session.status,
        new_status: newStatus,
        user_id: user?.id,
        timestamp: new Date().toISOString()
      });
      
      const { data, error } = await supabase.rpc('toggle_session_visibility', {
        _session_id: session.id,
        _new_status: newStatus
      });

      if (error) {
        console.error('❌ Error toggling session visibility:', {
          error,
          message: error.message,
          hint: error.hint,
          details: error.details,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Session visibility toggled successfully:', data);

      toast.success(
        newStatus === 'hidden' 
          ? 'Sessione nascosta agli utenti' 
          : 'Sessione ora visibile agli utenti'
      );
      
      onSessionUpdate?.();
    } catch (error: any) {
      console.error('❌ Error in toggleSessionVisibility:', error);
      toast.error(error.message || 'Errore durante la modifica della visibilità');
    } finally {
      setToggleVisibilityLoading(false);
    }
  };

  const cancelSession = async (reason?: string) => {
    if (!user?.id) return;

    setCancellingSession(true);
    try {
      console.log('🚫 Cancelling session:', {
        session_id: session.id,
        user_id: user.id,
        reason,
        timestamp: new Date().toISOString()
      });

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
    console.log('🎯 Subscription badge clicked:', {
      participant: participant.user.first_name + ' ' + participant.user.last_name,
      user_id: participant.user_id,
      has_subscription: !!participant.subscription
    });
    
    // Only handle click if user has no subscription
    if (!participant.subscription) {
      setSelectedUserForSubscription({
        id: participant.user_id,
        name: `${participant.user.first_name} ${participant.user.last_name}`,
        email: participant.user.email
      });
      setSubscriptionDialogOpen(true);
      console.log('✅ Opening subscription dialog for user:', participant.user_id);
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
    <Drawer 
      open={open} 
      onOpenChange={setOpen}
      shouldScaleBackground={false}
    >
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className={cn(
        "max-h-[85vh] flex flex-col",
        isMobile && "max-h-[90vh] min-h-[60vh]"
      )}>
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSessionVisibility}
                  disabled={toggleVisibilityLoading}
                  className={cn(
                    "gap-2",
                    session.status === 'hidden' 
                      ? "text-orange-600 hover:text-orange-700" 
                      : "text-blue-600 hover:text-blue-700"
                  )}
                >
                  {toggleVisibilityLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : session.status === 'hidden' ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {session.status === 'hidden' ? 'Mostra' : 'Nascondi'}
                </Button>
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
          <div className={cn(
            "flex-1 overflow-y-auto p-4",
            isMobile && "min-h-[300px] max-h-[60vh]"
          )}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Partecipanti Iscritti ({participants.length})
              </h4>
              {isMobile && (
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  📱 Mobile ({window.innerWidth}x{window.innerHeight})
                </div>
              )}
            </div>

            {/* Mobile Debug Info */}
            {isMobile && (
              <div className="mb-4 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                Debug: Session {session.id.slice(0, 8)}... | 
                Loading: {loading ? 'YES' : 'NO'} | 
                Count: {participants.length} |
                Viewport: {window.innerHeight}px
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-pulse">Caricamento partecipanti...</div>
                <div className="text-xs mt-2">📱 {isMobile ? 'Mobile' : 'Desktop'}</div>
                <div className="text-xs mt-1">Session: {session.id.slice(0, 8)}...</div>
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nessun partecipante iscritto</p>
                <p className="text-xs mt-1">📱 {isMobile ? 'Mobile' : 'Desktop'}</p>
                <p className="text-xs">Session: {session.id}</p>
                <p className="text-xs">Course: {session.course_name}</p>
                {isMobile && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-3 text-xs"
                    onClick={() => {
                      // Add mock data for testing
                      const mockParticipant: Participant = {
                        id: 'test-booking-' + Date.now(),
                        user_id: 'test-user-' + Date.now(),
                        status: 'confirmed',
                        credits_used: 1,
                        user: {
                          first_name: 'Test',
                          last_name: 'User',
                          email: 'test@test.com',
                          profile_picture_url: null,
                          current_credits: 10
                        },
                        subscription: null,
                        medical_certificate: null
                      };
                      setParticipants([mockParticipant]);
                      console.log('🧪 [MOBILE DEBUG] Added mock participant for testing');
                    }}
                  >
                    🧪 Test con dati mock
                  </Button>
                )}
              </div>
            ) : (
              <div className={cn(
                "space-y-3",
                isMobile && "space-y-4"
              )}>
                {participants.map((participant) => (
                  <Card key={participant.id} className={cn(
                    "border-l-4 border-l-primary/20 transition-all duration-200",
                    isMobile && "bg-card/90 shadow-sm hover:shadow-md"
                  )}>
                    <CardContent className={cn(
                      "p-3",
                      isMobile && "p-4"
                    )}>
                      <div className={cn(
                        "flex items-center justify-between",
                        isMobile && "flex-col space-y-3"
                      )}>
                        <div className={cn(
                          "flex items-center gap-3",
                          isMobile && "w-full"
                        )}>
                          <Avatar className={cn(
                            "h-10 w-10 ring-2 ring-background",
                            isMobile && "h-12 w-12"
                          )}>
                            <AvatarImage src={participant.user.profile_picture_url} />
                            <AvatarFallback className="font-semibold">
                              {participant.user.first_name[0]}{participant.user.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium text-sm truncate",
                              isMobile && "text-base"
                            )}>
                              {participant.user.first_name} {participant.user.last_name}
                            </p>
                            <p className={cn(
                              "text-xs text-muted-foreground truncate",
                              isMobile && "text-sm"
                            )}>
                              {participant.user.email}
                            </p>
                            <div className={cn(
                              "space-y-2 mt-2",
                              isMobile && "mt-3"
                            )}>
                              <div className={cn(
                                "flex items-center gap-2",
                                isMobile && "flex-wrap gap-3"
                              )}>
                                <Badge variant="outline" className={cn(
                                  "text-xs font-medium",
                                  isMobile && "text-sm px-3 py-1"
                                )}>
                                  {participant.user.current_credits} crediti
                                </Badge>
                                <Badge variant="secondary" className={cn(
                                  "text-xs",
                                  isMobile && "text-sm px-3 py-1"
                                )}>
                                  {participant.status}
                                </Badge>
                              </div>
                              
                              <div className={cn(
                                "flex flex-col gap-1",
                                isMobile && "gap-2"
                              )}>
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
                          size={isMobile ? "default" : "sm"}
                          onClick={() => removeParticipant(participant.id)}
                          disabled={removing === participant.id}
                          className={cn(
                            "text-destructive hover:text-destructive shrink-0",
                            isMobile && "w-full gap-2 h-10"
                          )}
                        >
                          {removing === participant.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                          {isMobile && "Rimuovi"}
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