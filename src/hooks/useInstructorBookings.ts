import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface InstructorBooking {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  credits_used: number;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  course: {
    id: string;
    name: string;
    gym: {
      name: string;
    };
  };
}

export const useInstructorBookings = () => {
  const [bookings, setBookings] = useState<InstructorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInstructorBookings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get instructor record first
      const { data: instructor, error: instructorError } = await supabase
        .from('instructors')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (instructorError || !instructor) {
        throw new Error('Istruttore non trovato');
      }

      // Get bookings for instructor's courses
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          status,
          credits_used,
          created_at,
          user:profiles!bookings_user_id_fkey(
            first_name,
            last_name,
            email,
            phone
          ),
          course:courses(
            id,
            name,
            gym:gyms(name)
          )
        `)
        .in('course_id', 
          await supabase
            .from('courses')
            .select('id')
            .eq('instructor_id', instructor.id)
            .then(({ data }) => data?.map(c => c.id) || [])
        )
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (bookingsError) throw bookingsError;

      setBookings((bookingsData as any) || []);
    } catch (err) {
      console.error('Error fetching instructor bookings:', err);
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle prenotazioni');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string, reason?: string) => {
    try {
      // Get booking details first
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        throw new Error('Prenotazione non trovata');
      }

      // Update booking status
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'Cancellata dall\'istruttore'
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Process refund (instructors can always refund)
      const { processRefund } = await import('@/lib/creditRefundHelpers');
      const refundResult = await processRefund(booking, user?.id || '', 'instructor', reason);

      toast({
        title: "Prenotazione cancellata",
        description: refundResult.success 
          ? "La prenotazione è stata cancellata e i crediti sono stati rimborsati."
          : "La prenotazione è stata cancellata con successo."
      });

      // Refresh bookings
      await fetchInstructorBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile cancellare la prenotazione."
      });
    }
  };

  useEffect(() => {
    fetchInstructorBookings();
  }, [user?.id]);

  return {
    bookings,
    loading,
    error,
    cancelBooking,
    refetch: fetchInstructorBookings
  };
};