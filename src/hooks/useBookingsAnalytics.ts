import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { toast } from 'sonner';

export interface BookingAnalytic {
  id: string;
  user_id: string;
  course_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'waitlist' | 'no_show';
  credits_used: number;
  created_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  course_name: string;
  instructor_name: string;
  gym_name: string;
  room_name: string;
  is_consolidated: boolean;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  user_phone?: string;
  booking_year: number;
  booking_month: number;
  booking_week: number;
  booking_day_of_week: number;
}

export interface UserBookingAnalytic {
  user_id: string;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  gym_name: string;
  total_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  no_show_bookings: number;
  total_credits_used: number;
  first_booking_date: string;
  last_booking_date: string;
  unique_courses_booked: number;
  avg_credits_per_booking: number;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  courseId?: string;
  userId?: string;
}

export const useBookingsAnalytics = () => {
  const [bookings, setBookings] = useState<BookingAnalytic[]>([]);
  const [userStats, setUserStats] = useState<UserBookingAnalytic[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { selectedGym } = useOwnerGym();

  const fetchBookingsAnalytics = async (filters: AnalyticsFilters = {}) => {
    if (!user?.id || !selectedGym) {
      setBookings([]);
      setUserStats([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const gymId = selectedGym.id;
      console.log("🔍 Loading analytics for gym:", {
        gymId,
        gymName: selectedGym.name,
        filters
      });

      // Build the query with filters
      let query = supabase
        .from('bookings')
        .select(`
          *,
          courses!inner (
            name,
            gym_id,
            instructors (
              first_name,
              last_name
            )
          ),
          profiles!inner (
            first_name,
            last_name,
            email,
            phone
          ),
          course_sessions (
            room_name,
            gym_rooms (name)
          )
        `)
        .eq('courses.gym_id', gymId);

      // Apply filters
      if (filters.startDate) {
        query = query.gte('scheduled_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('scheduled_date', filters.endDate);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'confirmed' | 'cancelled' | 'completed' | 'waitlist' | 'no_show');
      }
      if (filters.courseId) {
        query = query.eq('course_id', filters.courseId);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data: bookingsData, error } = await query
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Errore nel caricamento dei dati analitici');
        return;
      }

      // Transform data using consolidated fields where available
      const formattedData: BookingAnalytic[] = (bookingsData || []).map((booking: any) => {
        const scheduledDate = new Date(booking.scheduled_date);
        
        return {
          ...booking,
          course_name: booking.course_name_snapshot || booking.courses?.name || 'Corso sconosciuto',
          instructor_name: booking.instructor_name_snapshot || 
            (booking.courses?.instructors ? 
              `${booking.courses.instructors.first_name || ''} ${booking.courses.instructors.last_name || ''}`.trim() : 
              'Istruttore sconosciuto'),
          gym_name: booking.gym_name_snapshot || selectedGym.name,
          room_name: booking.room_name_snapshot || 
            booking.course_sessions?.room_name || 
            booking.course_sessions?.gym_rooms?.name || 
            'Sala non assegnata',
          user_first_name: booking.profiles?.first_name,
          user_last_name: booking.profiles?.last_name,
          user_email: booking.profiles?.email,
          user_phone: booking.profiles?.phone,
          booking_year: scheduledDate.getFullYear(),
          booking_month: scheduledDate.getMonth() + 1,
          booking_week: getWeekNumber(scheduledDate),
          booking_day_of_week: scheduledDate.getDay()
        };
      });

      setBookings(formattedData);
      
      // Calculate user statistics
      const userStatsMap = new Map<string, UserBookingAnalytic>();
      formattedData.forEach(booking => {
        const userId = booking.user_id;
        if (!userStatsMap.has(userId)) {
          userStatsMap.set(userId, {
            user_id: userId,
            user_first_name: booking.user_first_name,
            user_last_name: booking.user_last_name,
            user_email: booking.user_email,
            gym_name: booking.gym_name,
            total_bookings: 0,
            confirmed_bookings: 0,
            completed_bookings: 0,
            cancelled_bookings: 0,
            no_show_bookings: 0,
            total_credits_used: 0,
            first_booking_date: booking.created_at,
            last_booking_date: booking.created_at,
            unique_courses_booked: 0,
            avg_credits_per_booking: 0
          });
        }

        const stats = userStatsMap.get(userId)!;
        stats.total_bookings++;
        
        if (booking.status === 'confirmed') stats.confirmed_bookings++;
        else if (booking.status === 'completed') stats.completed_bookings++;
        else if (booking.status === 'cancelled') stats.cancelled_bookings++;
        else if (booking.status === 'no_show') stats.no_show_bookings++;
        
        stats.total_credits_used += booking.credits_used;
        
        if (booking.created_at < stats.first_booking_date) {
          stats.first_booking_date = booking.created_at;
        }
        if (booking.created_at > stats.last_booking_date) {
          stats.last_booking_date = booking.created_at;
        }
      });

      // Calculate unique courses and average credits
      const uniqueCoursesMap = new Map<string, Set<string>>();
      formattedData.forEach(booking => {
        if (!uniqueCoursesMap.has(booking.user_id)) {
          uniqueCoursesMap.set(booking.user_id, new Set());
        }
        uniqueCoursesMap.get(booking.user_id)!.add(booking.course_id);
      });

      Array.from(userStatsMap.values()).forEach(stats => {
        stats.unique_courses_booked = uniqueCoursesMap.get(stats.user_id)?.size || 0;
        stats.avg_credits_per_booking = stats.total_bookings > 0 ? 
          stats.total_credits_used / stats.total_bookings : 0;
      });

      setUserStats(Array.from(userStatsMap.values()));

    } catch (error) {
      console.error('Unexpected error in analytics:', error);
      toast.error('Errore imprevisto nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  useEffect(() => {
    fetchBookingsAnalytics();
  }, [user?.id, selectedGym]);

  return {
    bookings,
    userStats,
    loading,
    fetchBookingsAnalytics
  };
};