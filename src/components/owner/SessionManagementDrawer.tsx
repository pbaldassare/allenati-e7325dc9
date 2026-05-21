import React, { useState, useEffect, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  EyeOff,
  Signal,
  Save,
  ArrowUp,
  ListOrdered,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVirtualKeyboard } from '@/hooks/useVirtualKeyboard';
import { CancelSessionDialog } from '@/components/dialogs/CancelSessionDialog';
import { processRefund, getUserRole } from '@/lib/creditRefundHelpers';
import { promoteFromWaitlist, cancelWaitlistBooking } from '@/lib/waitlistHelpers';
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
  difficulty_level?: number | null;
  instructor_id_override?: string | null;
  instructor_name?: string;
}

const difficultyLabels: Record<number, string> = {
  1: 'Principiante',
  2: 'Intermedio',
  3: 'Avanzato'
};

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
  const { isVisible: keyboardVisible } = useVirtualKeyboard();
  const [open, setOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [waitlistParticipants, setWaitlistParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [toggleVisibilityLoading, setToggleVisibilityLoading] = useState(false);
  const [cancellingSession, setCancellingSession] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedUserForSubscription, setSelectedUserForSubscription] = useState<{ id: string; name: string; email: string } | null>(null);
  
  // Session edit state
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [editMaxParticipants, setEditMaxParticipants] = useState<number>(session.max_participants);
  const [editDifficultyLevel, setEditDifficultyLevel] = useState<number | null>(session.difficulty_level ?? null);
  const [editInstructorIdOverride, setEditInstructorIdOverride] = useState<string | null>(session.instructor_id_override ?? null);
  const [savingSession, setSavingSession] = useState(false);
  
  // Instructor data
  const [courseInstructorId, setCourseInstructorId] = useState<string | null>(null);
  const [availableInstructors, setAvailableInstructors] = useState<Array<{
    id: string;
    user_id: string;
    firstName: string;
    lastName: string;
  }>>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  useEffect(() => {
    if (open) {
      loadParticipants();
      loadWaitlistParticipants();
      loadCourseInstructorAndAvailableInstructors();
      // Reset edit state when opening
      setEditMaxParticipants(session.max_participants);
      setEditDifficultyLevel(session.difficulty_level ?? null);
      setEditInstructorIdOverride(session.instructor_id_override ?? null);
      setIsEditingSession(false);
    }
  }, [open, session.id]);
  
  const loadCourseInstructorAndAvailableInstructors = async () => {
    setLoadingInstructors(true);
    try {
      // Get course instructor_id and gym_id
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('instructor_id, gym_id')
        .eq('id', session.course_id)
        .single();

      if (courseError) throw courseError;
      
      setCourseInstructorId(courseData?.instructor_id || null);
      
      if (!courseData?.gym_id) return;

      // Get instructors from gym_assignments
      const { data: gymAssignments } = await supabase
        .from('instructor_gym_assignments')
        .select('instructor_id')
        .eq('gym_id', courseData.gym_id)
        .eq('is_active', true);

      // Get instructors from legacy instructors.gym_id
      const { data: directInstructors } = await supabase
        .from('instructors')
        .select('id')
        .eq('gym_id', courseData.gym_id)
        .eq('is_active', true);

      // Combine both sources
      const assignmentIds = gymAssignments?.map(a => a.instructor_id) || [];
      const directIds = directInstructors?.map(i => i.id) || [];
      const allInstructorIds = [...new Set([...assignmentIds, ...directIds])];

      if (allInstructorIds.length === 0) {
        setAvailableInstructors([]);
        return;
      }

      // Get instructor details
      const { data: instructorsData } = await supabase
        .from('instructors')
        .select('id, user_id, first_name, last_name')
        .in('id', allInstructorIds)
        .eq('is_active', true);

      // Get profiles for better names
      const userIds = instructorsData?.map(i => i.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const instructors = (instructorsData || []).map(instructor => {
        const profile = profileMap.get(instructor.user_id);
        return {
          id: instructor.id,
          user_id: instructor.user_id,
          firstName: profile?.first_name || instructor.first_name || 'N/D',
          lastName: profile?.last_name || instructor.last_name || '',
        };
      });

      setAvailableInstructors(instructors);
    } catch (error) {
      console.error('Error loading instructors:', error);
    } finally {
      setLoadingInstructors(false);
    }
  };

  // Update local state when session prop changes
  useEffect(() => {
    setEditMaxParticipants(session.max_participants);
    setEditDifficultyLevel(session.difficulty_level ?? null);
    setEditInstructorIdOverride(session.instructor_id_override ?? null);
  }, [session.max_participants, session.difficulty_level, session.instructor_id_override]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 1) {
      setSearchResults([]);
      setSearchPerformed(false);
      setSearching(false);
      return;
    }
    const debounceTimer = setTimeout(() => {
      setSearching(true);
      searchUsers();
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
          .select('user_id, first_name, last_name, email')
          .in('user_id', userIds);

        // Get gym-specific credits for fallback  
        const { data: fallbackGymCredits } = await supabase
          .from('gym_credits')
          .select('user_id, credits')
          .in('user_id', userIds);

        const fallbackParticipants: Participant[] = simpleBookings.map(booking => {
          const profile = fallbackProfiles?.find(p => p.user_id === booking.user_id);
          const userGymCredits = fallbackGymCredits?.find(gc => gc.user_id === booking.user_id);
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
              current_credits: userGymCredits?.credits || 0 // Use gym-specific credits
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

  const loadWaitlistParticipants = async () => {
    try {
      const { data: waitlistData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          status,
          credits_used,
          waitlist_position,
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
        .eq('status', 'waitlist')
        .eq('session_id', session.id)
        .order('waitlist_position', { ascending: true });

      if (error) throw error;

      const waitlist: Participant[] = (waitlistData || []).map((booking: any) => ({
        id: booking.id,
        user_id: booking.user_id,
        status: booking.status,
        credits_used: booking.credits_used,
        user: {
          first_name: booking.profiles?.first_name || 'Utente',
          last_name: booking.profiles?.last_name || 'Sconosciuto',
          email: booking.profiles?.email || 'N/A',
          profile_picture_url: booking.profiles?.profile_picture_url,
          current_credits: booking.profiles?.current_credits || 0
        },
        subscription: null,
        medical_certificate: null
      }));

      setWaitlistParticipants(waitlist);
    } catch (error) {
      console.error('Error loading waitlist:', error);
    }
  };

  const searchUsers = async () => {
    try {
      // Sanitize input for PostgREST .or() syntax (escape % , ( ) )
      const raw = searchTerm.trim();
      const safe = raw.replace(/[\\%,()]/g, ' ').trim();
      if (!safe) {
        setSearchResults([]);
        setSearchPerformed(true);
        setSearching(false);
        return;
      }

      // First get the gym_id from the session's course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('gym_id')
        .eq('id', session.course_id)
        .single();

      if (courseError || !courseData?.gym_id) {
        console.error('Error fetching gym_id:', courseError);
        toast.error('Errore nel recupero della palestra');
        setSearching(false);
        return;
      }

      const gymId = courseData.gym_id;

      // Get active memberships for this gym
      const { data: memberships, error: membershipError } = await supabase
        .from('user_gym_memberships')
        .select('user_id')
        .eq('gym_id', gymId)
        .eq('status', 'active');

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length === 0) {
        setSearchResults([]);
        setSearchPerformed(true);
        setSearching(false);
        return;
      }

      const memberUserIds = memberships.map(m => m.user_id);

      // Search profiles only for gym members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, profile_picture_url')
        .in('user_id', memberUserIds)
        .or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%`)
        .limit(8);

      if (profilesError) throw profilesError;

      const profileList = profiles || [];

      // Batch credits in a single query (no N+1)
      let creditsByUser = new Map<string, number>();
      if (profileList.length > 0) {
        const ids = profileList.map(p => p.user_id);
        const { data: creditsRows } = await supabase
          .from('gym_credits')
          .select('user_id, credits')
          .eq('gym_id', gymId)
          .in('user_id', ids);
        creditsByUser = new Map((creditsRows || []).map(r => [r.user_id, r.credits || 0]));
      }

      const users: User[] = profileList.map(profile => ({
        id: profile.user_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        current_credits: creditsByUser.get(profile.user_id) || 0,
        profile_picture_url: profile.profile_picture_url,
      }));

      // Filter out already enrolled users
      const enrolledUserIds = participants.map(p => p.user_id);
      const availableUsers = users.filter(u => !enrolledUserIds.includes(u.id));

      setSearchResults(availableUsers);
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Errore nella ricerca utenti');
      setSearchResults([]);
      setSearchPerformed(true);
    } finally {
      setSearching(false);
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

  const enrollToWaitlist = async (userId: string) => {
    setEnrolling(userId);
    try {
      const { data: bookingId, error } = await supabase.rpc('manual_enroll_to_waitlist', {
        _user_id: userId,
        _session_id: session.id,
        _enrolled_by: user?.id
      });

      if (error) throw error;

      toast.success('Utente aggiunto alla lista d\'attesa!');
      await loadWaitlistParticipants();
      setSearchTerm('');
      setSearchResults([]);
      onSessionUpdate?.();
    } catch (error: any) {
      console.error('Error enrolling to waitlist:', error);
      toast.error(error.message || 'Errore nell\'iscrizione alla waitlist');
    } finally {
      setEnrolling(null);
    }
  };

  const removeParticipant = async (bookingId: string) => {
    setRemoving(bookingId);
    try {
      console.log('🔍 STEP 1: Fetching booking data for:', bookingId);
      
      // Get full booking data with course and gym info for refund processing
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          courses(
            id,
            name,
            gym_id,
            credits_required
          )
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching booking:', fetchError);
        throw fetchError;
      }
      if (!booking) {
        console.error('❌ Booking not found');
        throw new Error('Booking not found');
      }

      console.log('✅ STEP 1 COMPLETE - Booking data:', {
        bookingId: booking.id,
        userId: booking.user_id,
        creditsUsed: booking.credits_used,
        status: booking.status,
        courseId: booking.course_id,
        courseName: booking.courses?.name,
        gymId: booking.courses?.gym_id,
        createdAt: booking.created_at
      });

      // Validate required data
      if (!booking.user_id) {
        throw new Error('Missing user_id in booking');
      }
      if (!booking.courses?.gym_id) {
        console.warn('⚠️ No gym_id in courses object, will be fetched by processRefund');
      }

      console.log('🔍 STEP 2: Updating booking status to cancelled');
      
      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Rimosso dallo staff dal calendario',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('❌ Error updating booking status:', updateError);
        throw updateError;
      }

      console.log('✅ STEP 2 COMPLETE - Booking status updated');

      console.log('🔍 STEP 3: Getting staff role for current user:', user?.id);
      
      let staffRole: 'user' | 'instructor' | 'owner' | 'admin';
      try {
        staffRole = await getUserRole(user!.id);
        console.log('✅ STEP 3 COMPLETE - Staff role:', staffRole);
      } catch (roleError) {
        console.error('❌ Error getting staff role:', roleError);
        // Default to 'owner' since this is the owner panel
        staffRole = 'owner';
        console.log('⚠️ Defaulting to owner role');
      }

      console.log('🔍 STEP 4: Processing credit refund with params:', {
        bookingId: booking.id,
        userId: booking.user_id,
        staffRole,
        creditsUsed: booking.credits_used,
        gymId: booking.courses?.gym_id,
        reason: 'Rimosso dallo staff dal calendario'
      });

      const refundResult = await processRefund(
        booking,
        booking.user_id,
        staffRole,
        'Rimosso dallo staff dal calendario'
      );

      console.log('✅ STEP 4 COMPLETE - Refund result:', {
        success: refundResult.success,
        message: refundResult.message
      });

      // MIGLIORIA: Mostrare sempre il risultato del rimborso con dettagli
      if (!refundResult.success) {
        console.error('❌ REFUND FAILED:', refundResult.message);
        toast.error(`Partecipante rimosso MA errore rimborso: ${refundResult.message}`);
      } else if (refundResult.message.includes('refunded')) {
        console.log('✅ REFUND SUCCESS - Credits refunded');
        toast.success(
          `Partecipante rimosso e ${booking.credits_used} credito/i rimborsato/i`
        );
      } else {
        // Caso: nessun rimborso necessario (es. abbonamento illimitato)
        console.log('ℹ️ NO REFUND NEEDED:', refundResult.message);
        toast.success('Partecipante rimosso');
        toast.info(refundResult.message);
      }

      console.log('🔍 STEP 5: Reloading participants and updating session');
      await loadParticipants();
      onSessionUpdate?.();
      console.log('✅ STEP 5 COMPLETE - All done!');
      
    } catch (error) {
      console.error('❌ FATAL ERROR in removeParticipant:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
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

  const handlePromoteFromWaitlist = async (bookingId: string) => {
    setPromoting(bookingId);
    try {
      const result = await promoteFromWaitlist(bookingId);
      
      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(result.message);
      loadParticipants();
      loadWaitlistParticipants();
      onSessionUpdate?.();
    } catch (error: any) {
      console.error('Error promoting from waitlist:', error);
      toast.error(error.message || 'Errore durante la promozione');
    } finally {
      setPromoting(null);
    }
  };

  const handleRemoveFromWaitlist = async (bookingId: string, userId: string) => {
    setRemoving(bookingId);
    try {
      const result = await cancelWaitlistBooking(bookingId, userId);
      
      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(result.message);
      loadWaitlistParticipants();
    } catch (error: any) {
      console.error('Error removing from waitlist:', error);
      toast.error(error.message || 'Errore durante la rimozione');
    } finally {
      setRemoving(null);
    }
  };

  const saveSessionChanges = async () => {
    setSavingSession(true);
    try {
      // Calculate new available spots based on current bookings
      const currentBookedCount = session.max_participants - session.available_spots;
      const newAvailableSpots = Math.max(0, editMaxParticipants - currentBookedCount);

      const { error } = await supabase
        .from('course_sessions')
        .update({
          max_participants: editMaxParticipants,
          available_spots: newAvailableSpots,
          difficulty_level: editDifficultyLevel,
          instructor_id_override: editInstructorIdOverride
        })
        .eq('id', session.id);

      if (error) throw error;

      toast.success('Sessione aggiornata con successo');
      setIsEditingSession(false);
      onSessionUpdate?.();
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Errore durante l\'aggiornamento della sessione');
    } finally {
      setSavingSession(false);
    }
  };

  const occupancyRate = ((session.max_participants - session.available_spots) / session.max_participants) * 100;
  const isAlmostFull = session.available_spots <= 3 && session.available_spots > 0;
  const isFull = session.available_spots <= 0;

  const HeaderContent = () => (
    <>
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
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSessionVisibility}
            disabled={toggleVisibilityLoading}
            aria-label={session.status === 'hidden' ? 'Mostra sessione' : 'Nascondi sessione'}
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
            <span className="hidden sm:inline">
              {session.status === 'hidden' ? 'Mostra' : 'Nascondi'}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCancelDialogOpen(true)}
            aria-label="Cancella sessione"
            className="text-destructive hover:text-destructive gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Cancella</span>
          </Button>
        </div>
      </div>
    </>
  );

  const BodyContent = () => (
    <>
      {/* Session Settings Section */}
      <div className="p-4 border-b bg-muted/10 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Signal className="h-4 w-4" />
            Impostazioni Sessione
          </h4>
          {!isEditingSession ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingSession(true)}
            >
              Modifica
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditingSession(false);
                  setEditMaxParticipants(session.max_participants);
                  setEditDifficultyLevel(session.difficulty_level ?? null);
                  setEditInstructorIdOverride(session.instructor_id_override ?? null);
                }}
              >
                Annulla
              </Button>
              <Button
                size="sm"
                onClick={saveSessionChanges}
                disabled={savingSession}
                className="gap-1"
              >
                {savingSession ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salva
              </Button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Max Partecipanti</label>
            {isEditingSession ? (
              <Input
                type="number"
                min={1}
                value={editMaxParticipants}
                onChange={(e) => setEditMaxParticipants(parseInt(e.target.value) || 1)}
                className="h-9"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{session.max_participants}</span>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Difficoltà</label>
            {isEditingSession ? (
              <select
                value={editDifficultyLevel ?? ''}
                onChange={(e) => setEditDifficultyLevel(e.target.value ? parseInt(e.target.value) : null)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Non specificata</option>
                <option value="1">1 - Principiante</option>
                <option value="2">2 - Intermedio</option>
                <option value="3">3 - Avanzato</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <Signal className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {session.difficulty_level 
                    ? difficultyLabels[session.difficulty_level] || `Livello ${session.difficulty_level}`
                    : 'Non specificata'}
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Istruttore</label>
            {isEditingSession ? (
              <select
                value={editInstructorIdOverride || courseInstructorId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setEditInstructorIdOverride(value === courseInstructorId ? null : value || null);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={loadingInstructors}
              >
                {loadingInstructors ? (
                  <option>Caricamento...</option>
                ) : (
                  availableInstructors.map(instructor => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.firstName} {instructor.lastName}
                      {instructor.id === courseInstructorId ? ' (default)' : ''}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  {(() => {
                    const effectiveId = session.instructor_id_override || courseInstructorId;
                    const instructor = availableInstructors.find(i => i.id === effectiveId);
                    return instructor 
                      ? `${instructor.firstName} ${instructor.lastName}`
                      : session.instructor_name || 'N/D';
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Cerca utenti da iscrivere..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "pl-9 transition-all duration-200",
                isMobile && [
                  "h-12 text-base",
                  "focus:ring-2 focus:ring-primary/20",
                  "touch-manipulation"
                ]
              )}
            />
          </div>
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
                setSearchPerformed(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Stable results area — reserves space to avoid layout shifts while typing */}
        <div className={cn("mt-3", searchTerm.trim().length > 0 && "min-h-[3rem]")}>
          {searchTerm.trim().length > 0 && searching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ricerca in corso…
            </div>
          )}
          {searchTerm.trim().length > 0 && !searching && searchPerformed && searchResults.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Nessun utente trovato in questa palestra
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-56 overflow-y-auto">
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
                  size={isMobile ? "default" : "sm"}
                  onClick={() => isFull ? enrollToWaitlist(user.id) : enrollUser(user.id)}
                  disabled={enrolling === user.id}
                  variant={isFull ? "outline" : "default"}
                  className={cn(
                    isMobile && [
                      "h-10 min-w-[44px]",
                      "touch-manipulation",
                      "active:scale-95 transition-transform"
                    ],
                    isFull && "border-warning text-warning hover:bg-warning/10"
                  )}
                >
                  {enrolling === user.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : isFull ? (
                    <>
                      <ListOrdered className="h-4 w-4 mr-1" />
                      <span className="text-xs">Waitlist</span>
                    </>
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
      </div>

      {/* Participants List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Partecipanti Iscritti ({participants.length})
          </h4>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-pulse">Caricamento partecipanti...</div>
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="font-medium">Nessun partecipante iscritto</p>
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

        {/* Waitlist Section */}
        {waitlistParticipants.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-warning" />
                Lista d'Attesa ({waitlistParticipants.length})
              </h4>
            </div>

            <div className={cn("space-y-3", isMobile && "space-y-4")}>
              {waitlistParticipants.map((participant, index) => (
                <Card key={participant.id} className="border-l-4 border-l-warning/50">
                  <CardContent className={cn("p-3", isMobile && "p-4")}>
                    <div className={cn(
                      "flex items-center justify-between",
                      isMobile && "flex-col space-y-3"
                    )}>
                      <div className={cn(
                        "flex items-center gap-3",
                        isMobile && "w-full"
                      )}>
                        <Badge variant="secondary" className="font-bold text-sm">
                          #{index + 1}
                        </Badge>
                        <Avatar className={cn("h-10 w-10", isMobile && "h-12 w-12")}>
                          <AvatarImage src={participant.user.profile_picture_url} />
                          <AvatarFallback className="font-semibold">
                            {participant.user.first_name[0]}{participant.user.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium text-sm truncate", isMobile && "text-base")}>
                            {participant.user.first_name} {participant.user.last_name}
                          </p>
                          <p className={cn("text-xs text-muted-foreground truncate", isMobile && "text-sm")}>
                            {participant.user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {participant.credits_used} crediti trattenuti
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "flex gap-2",
                        isMobile && "w-full"
                      )}>
                        <Button
                          variant="outline"
                          size={isMobile ? "default" : "sm"}
                          onClick={() => handlePromoteFromWaitlist(participant.id)}
                          disabled={promoting === participant.id}
                          className={cn(
                            "gap-1",
                            isMobile && "flex-1 h-10",
                            isFull && "border-warning text-warning hover:bg-warning/10"
                          )}
                          title={isFull ? "Promuovi (sovraprenotazione)" : "Promuovi a confermato"}
                        >
                          {promoting === participant.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                          {isMobile && "Promuovi"}
                        </Button>
                        <Button
                          variant="outline"
                          size={isMobile ? "default" : "sm"}
                          onClick={() => handleRemoveFromWaitlist(participant.id, participant.user_id)}
                          disabled={removing === participant.id}
                          className={cn(
                            "text-destructive hover:text-destructive",
                            isMobile && "flex-1 h-10"
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer 
          open={open} 
          onOpenChange={setOpen}
        >
          <DrawerTrigger asChild>
            {children}
          </DrawerTrigger>
          <DrawerContent className="flex h-[100dvh] max-h-[100dvh] flex-col rounded-t-none p-0">
            <DrawerClose
              aria-label="Chiudi"
              className="absolute right-3 top-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted/80 text-foreground shadow hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </DrawerClose>
            <DrawerHeader className="shrink-0 border-b pr-14">
              <DrawerTitle className="sr-only">{session.course_name}</DrawerTitle>
              <div className="flex flex-col gap-3 text-left">
                <HeaderContent />
              </div>
            </DrawerHeader>

            <div
              data-vaul-no-drag
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <BodyContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            {children}
          </DialogTrigger>
          <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
            <DialogHeader className="shrink-0 border-b p-4 pr-12">
              <DialogTitle className="sr-only">{session.course_name}</DialogTitle>
              <div className="flex flex-col gap-3 text-left md:flex-row md:items-center md:justify-between">
                <HeaderContent />
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              <BodyContent />
            </div>
          </DialogContent>
        </Dialog>
      )}

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
    </>
  );
};