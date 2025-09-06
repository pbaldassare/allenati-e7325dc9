import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OwnerBooking {
  id: string;
  user_id: string;
  course_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'waitlist' | 'no_show';
  credits_used: number;
  checked_in_at?: string;
  cancelled_at?: string;
  created_at: string;
  notes?: string;
  cancellation_reason?: string;
  room_name?: string;
  // User details
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    profile_picture_url?: string;
    current_credits?: number;
  };
  // Course details
  course?: {
    name: string;
    deadline_hours?: number;
  };
}

export const useOwnerBookings = () => {
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOwnerBookings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // First get the owner's gym ID
      const { data: gymData, error: gymError } = await supabase
        .rpc('get_user_gym_id', { _user_id: user.id });

      if (gymError) {
        console.error('Error getting gym ID:', gymError);
        toast.error('Errore nel recupero dei dati palestra');
        return;
      }

      if (!gymData) {
        console.error('No gym found for owner');
        toast.error('Nessuna palestra associata al proprietario');
        setBookings([]);
        return;
      }

      console.log("🔍 Loading bookings for gym:", gymData);

      // 1) Prima query: bookings con corsi
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          courses!inner (
            name,
            deadline_hours,
            gym_id
          )
        `)
        .eq('courses.gym_id', gymData)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      console.log("📋 Bookings loaded:", bookingsData?.length || 0, bookingsData);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        toast.error('Errore nel caricamento delle prenotazioni');
        return;
      }

      const bookingsList = (bookingsData || []) as any[];
      const userIds = [...new Set(bookingsList.map((b) => b.user_id).filter(Boolean))];
      
      // 2) Seconda query: profili utenti
      let profilesById = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, email, phone, profile_picture_url, current_credits")
          .in("user_id", userIds);

        console.log('👤 User profiles loaded:', {
          requestedUserIds: userIds,
          foundProfiles: profilesData?.length || 0,
          error: profilesError,
          data: profilesData
        });

        if (!profilesError && profilesData) {
          profilesById = new Map(
            profilesData.map((p: any) => [p.user_id as string, p])
          );
        } else if (profilesError) {
          console.warn("Errore caricamento profili utenti:", profilesError);
        }
      }

      // 3) Terza query: sale per le sessioni (se necessario)
      const sessionIds = [...new Set(bookingsList.map((b) => b.session_id).filter(Boolean))];
      let roomsBySessionId = new Map<string, string>();
      
      if (sessionIds.length > 0) {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('course_sessions')
          .select(`
            id,
            room_name,
            gym_rooms (name)
          `)
          .in('id', sessionIds);

        console.log('🏠 Room data loaded:', sessionsData?.length || 0, sessionsData);

        if (!sessionsError && sessionsData) {
          sessionsData.forEach((s: any) => {
            const roomName = s.room_name || (s.gym_rooms?.name) || 'Sala non assegnata';
            roomsBySessionId.set(s.id, roomName);
          });
        }
      }

      // 4) Merge dei dati
      const formattedData: OwnerBooking[] = bookingsList.map((booking: any) => ({
        ...booking,
        user: profilesById.get(booking.user_id) || {
          first_name: "Nome",
          last_name: "Non Disponibile", 
          email: null,
          phone: null,
          profile_picture_url: null,
          current_credits: 0,
        },
        course: booking.courses,
        room_name: roomsBySessionId.get(booking.session_id) || 'Sala non assegnata'
      }));

      console.log("✅ Final formatted bookings:", formattedData.length, formattedData);
      setBookings(formattedData || []);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Errore imprevisto nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const cancelOwnerBooking = async (bookingId: string, reason?: string) => {
    if (!user?.id) return;

    try {
      // Get booking details first
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles (current_credits),
          courses (name, deadline_hours, gym_id)
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        console.error('Fetch error:', fetchError);
        toast.error('Errore nel recupero della prenotazione');
        return;
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'Cancellata dal proprietario'
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error('Errore nell\'aggiornamento della prenotazione');
        return;
      }

      // Process refund using new helper (owners can always refund)
      const { processRefund } = await import('@/lib/creditRefundHelpers');
      const refundResult = await processRefund(booking, user.id, 'owner', reason);

      // Refresh bookings
      await fetchOwnerBookings();
      
      toast.success(
        refundResult.success && refundResult.message.includes('credits refunded')
          ? 'Prenotazione cancellata e crediti rimborsati'
          : 'Prenotazione cancellata'
      );

    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Errore nella cancellazione');
    }
  };

  useEffect(() => {
    fetchOwnerBookings();

    // Subscribe to booking changes
    const channel = supabase
      .channel('owner-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          fetchOwnerBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    bookings,
    loading,
    fetchOwnerBookings,
    cancelOwnerBooking
  };
};