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

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles (
            first_name,
            last_name,
            email,
            phone,
            profile_picture_url,
            current_credits
          ),
          courses!inner (
            name,
            deadline_hours,
            gym_id
          ),
          course_sessions (
            room_name
          )
        `)
        .eq('courses.gym_id', gymData)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      const formattedData = data?.map(booking => ({
        ...booking,
        user: booking.profiles,
        course: booking.courses,
        room_name: (booking as any).course_sessions?.room_name || null
      })) as OwnerBooking[];

      if (error) {
        console.error('Error fetching owner bookings:', error);
        toast.error('Errore nel caricamento delle prenotazioni');
        return;
      }

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
          courses (name, deadline_hours)
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        console.error('Fetch error:', fetchError);
        toast.error('Errore nel recupero della prenotazione');
        return;
      }

      // Gym owners can always cancel bookings regardless of deadline
      const shouldRefund = true; // Always refund for owner cancellations

      // Start transaction
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

      // Refund credits if applicable
      if (shouldRefund && booking.credits_used > 0) {
        const currentCredits = (booking as any).profiles?.current_credits || 0;
        const newBalance = currentCredits + booking.credits_used;

        // Update user credits
        const { error: creditError } = await supabase
          .from('profiles')
          .update({ current_credits: newBalance })
          .eq('user_id', booking.user_id);

        if (creditError) {
          console.error('Error updating credits:', creditError);
          toast.error('Errore nel rimborso crediti');
          return;
        }

        // Log credit transaction
        const { error: transactionError } = await supabase
          .from('credits_transactions')
          .insert({
            user_id: booking.user_id,
            amount: booking.credits_used,
            balance_after: newBalance,
            transaction_type: 'refund',
            description: `Rimborso per cancellazione prenotazione - ${booking.courses?.name || 'Corso'}`,
            reference_id: bookingId
          });

        if (transactionError) {
          console.error('Error logging transaction:', transactionError);
        }
      }

      // Refresh bookings
      await fetchOwnerBookings();
      
      toast.success(
        shouldRefund 
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