import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Booking {
  id: string;
  user_id: string;
  course_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'confirmed' | 'waitlist' | 'cancelled' | 'completed' | 'no_show';
  credits_used: number;
  checked_in_at?: string;
  cancelled_at?: string;
  notes?: string;
  cancellation_reason?: string;
  course?: {
    name: string;
    instructor_name?: string;
    category_name?: string;
  };
}

export const useBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchBookings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          courses!inner(
            name,
            instructors(
              profiles(first_name, last_name)
            ),
            course_categories(name)
          )
        `)
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      const transformedBookings: Booking[] = (data || []).map(booking => ({
        id: booking.id,
        user_id: booking.user_id,
        course_id: booking.course_id,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        status: booking.status,
        credits_used: booking.credits_used,
        checked_in_at: booking.checked_in_at,
        cancelled_at: booking.cancelled_at,
        notes: booking.notes,
        cancellation_reason: booking.cancellation_reason,
        course: {
          name: booking.courses?.name || '',
          instructor_name: (booking.courses as any)?.instructors?.profiles 
            ? `${(booking.courses as any).instructors.profiles.first_name || ''} ${(booking.courses as any).instructors.profiles.last_name || ''}`.trim()
            : '',
          category_name: booking.courses?.course_categories?.name || ''
        }
      }));

      setBookings(transformedBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings
  };
};