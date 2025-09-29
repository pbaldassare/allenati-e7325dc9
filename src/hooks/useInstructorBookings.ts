import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorGym } from '@/contexts/InstructorGymContext';
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
  const { user, hasOwnerPrivileges } = useAuth();
  const { instructorGyms, selectedGymId } = useInstructorGym();
  const { toast } = useToast();

  const fetchInstructorBookings = async () => {
    if (!user?.id || !selectedGymId) return;

    try {
      setLoading(true);
      console.log('🔍 Fetching bookings for instructor:', user.id, 'gym:', selectedGymId, 'hasOwnerPrivileges:', hasOwnerPrivileges);
      
      let bookingsData;
      
      if (hasOwnerPrivileges) {
        // For super instructors, get ALL bookings from their gym
        const gymId = selectedGymId;

        // First get all course IDs for this gym
        const { data: gymCourses, error: coursesError } = await supabase
          .from('courses')
          .select('id')
          .eq('gym_id', gymId);

        if (coursesError) throw coursesError;
        
        const courseIds = gymCourses?.map(c => c.id) || [];
        console.log('🔍 Found courses for gym:', courseIds.length);

        if (courseIds.length === 0) {
          setBookings([]);
          return;
        }

        // Get all bookings for courses in the gym
        const { data: allBookingsData, error: bookingsError } = await supabase
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
          .in('course_id', courseIds)
          .order('scheduled_date', { ascending: false })
          .order('scheduled_time', { ascending: false });

        if (bookingsError) throw bookingsError;
        bookingsData = allBookingsData;
        console.log('🔍 Found bookings for gym:', bookingsData?.length || 0);
      } else {
        // Regular instructor - get only their course bookings
        const { data: instructor, error: instructorError } = await supabase
          .from('instructors')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (instructorError || !instructor) {
          throw new Error('Istruttore non trovato');
        }

        // First get all course IDs for this instructor
        const { data: instructorCourses, error: coursesError } = await supabase
          .from('courses')
          .select('id')
          .eq('instructor_id', instructor.id);

        if (coursesError) throw coursesError;
        
        const courseIds = instructorCourses?.map(c => c.id) || [];
        console.log('🔍 Found courses for instructor:', courseIds.length);

        if (courseIds.length === 0) {
          setBookings([]);
          return;
        }

        // Get bookings for instructor's courses
        const { data: instructorBookingsData, error: bookingsError } = await supabase
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
          .in('course_id', courseIds)
          .order('scheduled_date', { ascending: false })
          .order('scheduled_time', { ascending: false });

        if (bookingsError) throw bookingsError;
        bookingsData = instructorBookingsData;
        console.log('🔍 Found bookings for instructor:', bookingsData?.length || 0);
      }

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
      console.log('🔄 Starting booking cancellation for:', bookingId);
      
      // Get full booking details from database with course and gym info
      const { data: bookingData, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          course_id,
          scheduled_date,
          scheduled_time,
          status,
          credits_used,
          created_at,
          course:courses(
            id,
            name,
            gym_id,
            gym:gyms(name)
          )
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !bookingData) {
        console.error('❌ Error fetching booking data:', fetchError);
        throw new Error('Prenotazione non trovata nel database');
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
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'Cancellata dall\'istruttore'
        })
        .eq('id', bookingId);

      if (error) {
        console.error('❌ Error updating booking status:', error);
        throw error;
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

      // Process refund (instructors can always refund)
      const { processRefund } = await import('@/lib/creditRefundHelpers');
      const refundResult = await processRefund(bookingForRefund, bookingForRefund.user_id, 'instructor', reason);

      console.log('💰 Refund result:', refundResult);

      toast({
        title: "Prenotazione cancellata",
        description: refundResult.success 
          ? "La prenotazione è stata cancellata e i crediti sono stati rimborsati."
          : `La prenotazione è stata cancellata ma il rimborso ha fallito: ${refundResult.message}`
      });

      // Refresh bookings
      await fetchInstructorBookings();
    } catch (err) {
      console.error('❌ Error cancelling booking:', err);
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Impossibile cancellare la prenotazione: ${errorMessage}`
      });
    }
  };

  useEffect(() => {
    fetchInstructorBookings();
  }, [user?.id, selectedGymId]);

  return {
    bookings,
    loading,
    error,
    cancelBooking,
    refetch: fetchInstructorBookings
  };
};