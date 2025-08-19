import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type BookingWithCourse = any;

export const useBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          courses (
            id,
            name,
            image_url,
            deadline_hours,
            gym_id,
            instructor_id,
            gyms (
              id,
              name,
              address,
              city
            ),
            course_categories (
              name
            ),
            instructors (
              id,
              profiles!instructors_user_id_fkey (
                first_name,
                last_name
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le prenotazioni",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!user) return false;

    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error('Prenotazione non trovata');

      // Check if within cancellation deadline
      const course = booking.courses;
      const bookingDateTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
      const deadlineTime = new Date(bookingDateTime.getTime() - ((course?.deadline_hours || 24) * 60 * 60 * 1000));
      const now = new Date();
      const isWithinDeadline = now <= deadlineTime;

      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancellato dall\'utente'
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      // If within deadline and credits were used, refund them
      if (isWithinDeadline && booking.credits_used > 0) {
        // Get current user credits
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('current_credits')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        const newBalance = (profileData.current_credits || 0) + booking.credits_used;

        // Update credits
        const { error: creditsError } = await supabase
          .from('profiles')
          .update({ current_credits: newBalance })
          .eq('user_id', user.id);

        if (creditsError) throw creditsError;

        // Log transaction
        const { error: transactionError } = await supabase
          .from('credits_transactions')
          .insert({
            user_id: user.id,
            amount: booking.credits_used,
            balance_after: newBalance,
            transaction_type: 'refund',
            description: `Rimborso per cancellazione prenotazione: ${course?.name}`,
            reference_id: bookingId
          });

        if (transactionError) throw transactionError;
      }

      toast({
        title: "Prenotazione cancellata",
        description: isWithinDeadline 
          ? "La prenotazione è stata cancellata e i crediti sono stati rimborsati"
          : "La prenotazione è stata cancellata"
      });

      return true;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Errore",
        description: "Non è possibile cancellare questa prenotazione",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchBookings();

    // Set up real-time subscription
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchBookings(); // Refetch on any changes
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
    fetchBookings,
    cancelBooking
  };
};