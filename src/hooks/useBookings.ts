import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type BookingWithCourse = any;

export const useBookings = (gymId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorProfiles, setInstructorProfiles] = useState<Record<string, any>>({});

  const fetchBookings = async () => {
    if (!user) return;

    console.log('Fetching bookings for user:', user.id);

    try {
      let query = supabase
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
            instructors!courses_instructor_id_fkey (
              id,
              user_id
            )
          )
        `)
        .eq('user_id', user.id);

      // Filter by gym if gymId is provided
      if (gymId) {
        query = query.eq('courses.gym_id', gymId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      console.log('Bookings query result:', { data, error });

      if (error) throw error;

      // Get instructor profiles
      const instructorUserIds = [...new Set(data?.map(b => b.courses?.instructors?.user_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      
      if (instructorUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, profile_picture_url')
          .in('user_id', instructorUserIds);

        if (!profilesError && profilesData) {
          profilesData.forEach(profile => {
            profilesMap[profile.user_id] = profile;
          });
          setInstructorProfiles(profilesMap);
        }
      }

      // Enrich bookings data with instructor profiles
      const enrichedData = data?.map(booking => ({
        ...booking,
        courses: booking.courses ? {
          ...booking.courses,
          instructors: booking.courses.instructors ? {
            ...booking.courses.instructors,
            profiles: profilesMap[booking.courses.instructors.user_id] || null
          } : null
        } : null
      })) || [];
      
      setBookings(enrichedData);
      
      console.log('Setting bookings:', data);
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

    console.log('Cancelling booking:', bookingId);

    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error('Prenotazione non trovata');

      console.log('Found booking to cancel:', booking);

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

      // Process refund using new helper
      const { processRefund } = await import('@/lib/creditRefundHelpers');
      const refundResult = await processRefund(booking, user.id, 'user', 'Cancellato dall\'utente');

      toast({
        title: "Prenotazione cancellata",
        description: refundResult.success && refundResult.message.includes('credits refunded')
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
  }, [user?.id, gymId]);

  // Helper functions for session-specific booking management
  const isSessionBooked = (courseId: string, date: string, time: string) => {
    return bookings.some(b => 
      b.course_id === courseId && 
      b.scheduled_date === date && 
      b.scheduled_time === time &&
      b.status === 'confirmed'
    );
  };

  const getSessionBooking = (courseId: string, date: string, time: string) => {
    return bookings.find(b => 
      b.course_id === courseId && 
      b.scheduled_date === date && 
      b.scheduled_time === time &&
      b.status === 'confirmed'
    );
  };

  const getBookingsForCourse = (courseId: string) => {
    return bookings.filter(b => b.course_id === courseId && b.status === 'confirmed');
  };

  return {
    bookings,
    loading,
    fetchBookings,
    cancelBooking,
    // Session-specific helpers
    isSessionBooked,
    getSessionBooking,
    getBookingsForCourse
  };
};