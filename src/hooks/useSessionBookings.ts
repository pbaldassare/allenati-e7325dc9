import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SessionBooking {
  id: string;
  course_id: string;
  user_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'waitlist' | 'no_show';
  credits_used: number;
  created_at: string;
  courses?: {
    name: string;
    deadline_hours?: number;
    instructors?: {
      profiles?: {
        first_name: string;
        last_name: string;
      }
    }
  }
}

export const useSessionBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          courses (
            name,
            deadline_hours,
            instructors (
              user_id
            )
          ),
          course_sessions (
            id,
            session_date,
            start_time,
            end_time,
            room_name,
            available_spots,
            max_participants
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      // Get instructor profiles separately
      if (data && data.length > 0) {
        const instructorUserIds = data
          .map(booking => booking.courses?.instructors?.user_id)
          .filter(Boolean);
        
        if (instructorUserIds.length > 0) {
          const { data: instructorProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', instructorUserIds);
          
          if (!profilesError && instructorProfiles) {
            // Map instructor profiles to bookings
            const enrichedBookings = data.map((booking: any) => {
              if (booking.courses?.instructors?.user_id) {
                const profile = instructorProfiles.find(p => 
                  p.user_id === booking.courses.instructors.user_id
                );
                if (profile) {
                  (booking.courses.instructors as any).profiles = profile;
                }
              }
              return booking;
            });
            setBookings(enrichedBookings);
          } else {
            setBookings(data || []);
          }
        } else {
          setBookings(data || []);
        }
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching session bookings:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le prenotazioni",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if a specific session is booked (prefer session_id)
  const isSessionBooked = (sessionId?: string, courseId?: string, date?: string, time?: string) => {
    if (sessionId) {
      return bookings.some(b => b.session_id === sessionId);
    }
    return bookings.some(b => 
      b.course_id === courseId && 
      b.scheduled_date === date && 
      b.scheduled_time === time
    );
  };

  // Get booking for a specific session (prefer session_id)
  const getSessionBooking = (sessionId?: string, courseId?: string, date?: string, time?: string) => {
    if (sessionId) {
      return bookings.find(b => b.session_id === sessionId);
    }
    return bookings.find(b => 
      b.course_id === courseId && 
      b.scheduled_date === date && 
      b.scheduled_time === time
    );
  };

  // Get all bookings for a course (all sessions)
  const getCourseBookings = (courseId: string) => {
    return bookings.filter(b => b.course_id === courseId);
  };

  // Get bookings for a specific date
  const getDateBookings = (date: string) => {
    return bookings.filter(b => b.scheduled_date === date);
  };

  // Cancel a session booking (support both session_id and legacy courseId + date + time)
  const cancelSessionBooking = async (sessionId?: string, courseId?: string, date?: string, time?: string) => {
    const booking = getSessionBooking(sessionId, courseId, date, time);
    if (!booking) {
      toast({
        title: "Errore",
        description: "Prenotazione non trovata",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancellato dall\'utente'
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Update session available spots if session_id is available
      if (booking.session_id) {
        const { error: sessionError } = await supabase
          .from('course_sessions')
          .update({ 
            available_spots: Math.min(
              booking.course_sessions?.max_participants || 20,
              (booking.course_sessions?.available_spots || 0) + 1
            )
          })
          .eq('id', booking.session_id);

        if (sessionError) console.error('Error updating session spots:', sessionError);
      }

      // Process refund using new helper
      const { processRefund } = await import('@/lib/creditRefundHelpers');
      const refundResult = await processRefund(booking, user!.id, 'user', 'Cancellato dall\'utente');

      // Check if refund was denied due to deadline policy
      if (!refundResult.success && refundResult.message.includes('deadline')) {
        toast({
          title: "Impossibile cancellare",
          description: `Non è possibile cancellare la prenotazione. Il termine per la cancellazione gratuita è scaduto.`,
          variant: "destructive"
        });
        return false;
      }

      // Remove from local state
      setBookings(prev => prev.filter(b => b.id !== booking.id));

      toast({
        title: "Prenotazione cancellata",
        description: refundResult.success && refundResult.message.includes('credits refunded')
          ? "La prenotazione è stata cancellata e i crediti sono stati rimborsati"
          : "La prenotazione è stata cancellata"
      });

      return true;
    } catch (error) {
      console.error('Error cancelling session booking:', error);
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

    // Set up real-time subscription for session-specific bookings
    const channel = supabase
      .channel('session-bookings-changes')
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
    isSessionBooked,
    getSessionBooking,
    getCourseBookings,
    getDateBookings,
    cancelSessionBooking
  };
};