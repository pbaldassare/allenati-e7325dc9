import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { toast } from 'sonner';

// Splits an array into chunks of given size
const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

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

export interface UseOwnerBookingsOptions {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
}

const PAGE_SIZE = 1000;
const MAX_ROWS = 20000;

export const useOwnerBookings = (options: UseOwnerBookingsOptions = {}) => {
  const { dateFrom, dateTo } = options;
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { selectedGym } = useOwnerGym();
  // Monotonic request id to prevent race conditions
  const requestIdRef = useRef(0);

  const fetchOwnerBookings = async () => {
    if (!user?.id || !selectedGym) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const myRequest = ++requestIdRef.current;

    try {
      setLoading(true);

      const gymId = selectedGym.id;
      console.log('🔍 useOwnerBookings:', { gymId, dateFrom, dateTo });

      // Paginated fetch to bypass the 1000-row PostgREST default
      const bookingsList: any[] = [];
      let offset = 0;
      while (offset < MAX_ROWS) {
        let q = supabase
          .from('bookings')
          .select(`*, courses!inner (name, deadline_hours, gym_id)`)
          .eq('courses.gym_id', gymId);

        if (dateFrom) q = q.gte('scheduled_date', dateFrom);
        if (dateTo) q = q.lte('scheduled_date', dateTo);

        const { data, error } = await q
          .order('scheduled_date', { ascending: false })
          .order('scheduled_time', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.error('Error fetching bookings:', error);
          if (myRequest === requestIdRef.current) {
            toast.error('Errore nel caricamento delle prenotazioni');
          }
          return;
        }

        // Bail out if a newer request has started
        if (myRequest !== requestIdRef.current) return;

        const page = data || [];
        bookingsList.push(...page);
        if (page.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      const userIds = [...new Set(bookingsList.map((b) => b.user_id).filter(Boolean))];

      // 2) Profili utenti — chunked by 500 ids to avoid URL/IN-list limits
      const profilesById = new Map<string, any>();
      if (userIds.length > 0) {
        for (const ids of chunk(userIds, 500)) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, email, phone, profile_picture_url, current_credits')
            .in('user_id', ids);

          if (myRequest !== requestIdRef.current) return;

          if (profilesError) {
            console.warn('Errore caricamento profili utenti:', profilesError);
            continue;
          }
          (profilesData || []).forEach((p: any) => profilesById.set(p.user_id, p));
        }
      }

      // 3) Sale per le sessioni — chunked
      const sessionIds = [...new Set(bookingsList.map((b) => b.session_id).filter(Boolean))];
      const roomsBySessionId = new Map<string, string>();
      if (sessionIds.length > 0) {
        for (const ids of chunk(sessionIds, 500)) {
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('course_sessions')
            .select(`id, room_name, gym_rooms (name)`)
            .in('id', ids);

          if (myRequest !== requestIdRef.current) return;

          if (sessionsError) {
            console.warn('Errore caricamento sale:', sessionsError);
            continue;
          }
          (sessionsData || []).forEach((s: any) => {
            const roomName = s.room_name || s.gym_rooms?.name || 'Sala non assegnata';
            roomsBySessionId.set(s.id, roomName);
          });
        }
      }

      // 4) Merge dei dati
      const formattedData: OwnerBooking[] = bookingsList.map((booking: any) => ({
        ...booking,
        user: profilesById.get(booking.user_id) || {
          first_name: 'Nome',
          last_name: 'Non Disponibile',
          email: null,
          phone: null,
          profile_picture_url: null,
          current_credits: 0,
        },
        course: booking.courses,
        room_name: roomsBySessionId.get(booking.session_id) || 'Sala non assegnata',
      }));

      if (myRequest !== requestIdRef.current) return;

      console.log(`✅ Prenotazioni caricate: ${formattedData.length}`);
      setBookings(formattedData);
    } catch (error) {
      console.error('Unexpected error:', error);
      if (myRequest === requestIdRef.current) {
        toast.error('Errore imprevisto nel caricamento');
      }
    } finally {
      if (myRequest === requestIdRef.current) setLoading(false);
    }
  };

  const cancelOwnerBooking = async (bookingId: string, reason?: string) => {
    if (!user?.id) {
      console.log('❌ No user ID, cannot cancel booking');
      return;
    }

    try {
      console.log('🚀 Starting owner booking cancellation:', {
        bookingId,
        reason,
        userId: user.id
      });

      // Fetch complete booking data from database
      console.log('📋 Fetching booking data from database...');
      const { data: bookingData, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          course:courses (
            id,
            name,
            gym_id,
            deadline_hours
          )
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !bookingData) {
        console.error('❌ Error fetching booking data:', fetchError);
        toast.error('Errore nel recupero della prenotazione');
        return;
      }

      console.log('📋 Booking data fetched:', {
        id: bookingData.id,
        user_id: bookingData.user_id,
        course_id: bookingData.course_id,
        credits_used: bookingData.credits_used,
        gym_id: bookingData.course?.gym_id,
        status: bookingData.status
      });

      // Update booking status
      console.log('📝 Updating booking status to cancelled...');
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'Cancellata dal proprietario'
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('❌ Error updating booking status:', updateError);
        toast.error('Errore nell\'aggiornamento della prenotazione');
        return;
      }

      console.log('✅ Booking status updated successfully');

      // Prepare booking data for refund with gym_id
      const bookingForRefund = {
        ...bookingData,
        gym_id: bookingData.course?.gym_id,
        course: bookingData.course
      };

      console.log('💰 Processing refund with data:', {
        booking_id: bookingForRefund.id,
        user_id: bookingForRefund.user_id,
        gym_id: bookingForRefund.gym_id,
        credits_used: bookingForRefund.credits_used
      });

      // Process refund (owners can always refund)
      const { processRefund } = await import('@/lib/creditRefundHelpers');
      const refundResult = await processRefund(bookingForRefund, bookingForRefund.user_id, 'owner', reason);

      console.log('💰 Refund result:', refundResult);

      // Refresh bookings
      await fetchOwnerBookings();
      
      toast.success(
        refundResult.success && refundResult.message.includes('credits refunded')
          ? 'Prenotazione cancellata e crediti rimborsati'
          : 'Prenotazione cancellata'
      );

    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error(`Errore nella cancellazione: ${errorMessage}`);
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
  }, [user?.id, selectedGym, dateFrom, dateTo]);

  return {
    bookings,
    loading,
    fetchOwnerBookings,
    cancelOwnerBooking
  };
};