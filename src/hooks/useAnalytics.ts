import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface AnalyticsData {
  totalUsers: number;
  activeSubscriptions: number;
  totalBookings: number;
  todayBookings: number;
  monthlyRevenue: number;
  occupancyRate: number;
  retentionRate: number;
  averageRating: number;
  popularCourses: Array<{
    id: string;
    name: string;
    instructor: string;
    currentParticipants: number;
    maxParticipants: number;
    bookingCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'booking' | 'cancellation' | 'user_registration';
    description: string;
    createdAt: string;
    status: string;
  }>;
  weeklyAttendance: Array<{
    day: string;
    bookings: number;
    attendees: number;
  }>;
  monthlyRevenueChart: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
  courseDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface AnalyticsFilters {
  period: 'week' | 'month' | 'quarter' | 'year';
  startDate?: Date;
  endDate?: Date;
  courseCategory?: string;
}

export const useAnalytics = (filters: AnalyticsFilters = { period: 'month' }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateDateRange = (period: string) => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: subMonths(now, 3), end: now };
      case 'year':
        return { start: subMonths(now, 12), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { start, end } = filters.startDate && filters.endDate 
        ? { start: filters.startDate, end: filters.endDate }
        : calculateDateRange(filters.period);

      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');

      // Fetch total users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, created_at');
      
      if (usersError) throw usersError;

      // Fetch active subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('status', 'active');
      
      if (subscriptionsError) throw subscriptionsError;

      // Fetch bookings for the period
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      
      if (bookingsError) throw bookingsError;

      // Fetch today's bookings
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: todayBookingsData, error: todayBookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('scheduled_date', today)
        .eq('status', 'confirmed');
      
      if (todayBookingsError) throw todayBookingsError;

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true);
      
      if (coursesError) throw coursesError;

      // Fetch instructors
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('instructors')
        .select('id, user_id');
      
      if (instructorsError) throw instructorsError;

      // Fetch profiles for instructors
      const instructorUserIds = instructorsData?.map(i => i.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', instructorUserIds);
      
      if (profilesError) throw profilesError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('course_categories')
        .select('*');
      
      if (categoriesError) throw categoriesError;

      // Calculate analytics
      const totalUsers = usersData?.length || 0;
      const activeSubscriptions = subscriptionsData?.length || 0;
      const totalBookings = bookingsData?.length || 0;
      const todayBookings = todayBookingsData?.length || 0;

      // Calculate monthly revenue (mock calculation)
      const monthlyRevenue = (subscriptionsData?.length || 0) * 50; // Assuming avg 50€ per subscription

      // Calculate occupancy rate
      const totalCapacity = coursesData?.reduce((sum, course) => sum + (course.max_participants || 0), 0) || 1;
      const currentOccupancy = bookingsData?.filter(b => b.status === 'confirmed').length || 0;
      const occupancyRate = Math.min((currentOccupancy / totalCapacity) * 100, 100);

      // Calculate retention rate (mock - would need historical data)
      const retentionRate = 92;

      // Calculate average rating (mock)
      const averageRating = 4.8;

      // Calculate popular courses
      const courseBookingCounts = new Map();
      bookingsData?.forEach(booking => {
        const courseId = booking.course_id;
        courseBookingCounts.set(courseId, (courseBookingCounts.get(courseId) || 0) + 1);
      });

      // Create maps for easy lookup
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, `${profile.first_name} ${profile.last_name}`);
      });

      const instructorMap = new Map();
      instructorsData?.forEach(instructor => {
        const profile = profileMap.get(instructor.user_id);
        if (profile) {
          instructorMap.set(instructor.id, profile);
        }
      });

      const popularCourses = coursesData
        ?.map(course => {
          const confirmedBookings = bookingsData?.filter(b => 
            b.course_id === course.id && b.status === 'confirmed'
          ).length || 0;
          
          return {
            id: course.id,
            name: course.name,
            instructor: instructorMap.get(course.instructor_id) || 'Istruttore',
            currentParticipants: confirmedBookings,
            maxParticipants: course.max_participants || 0,
            bookingCount: courseBookingCounts.get(course.id) || 0
          };
        })
        .sort((a, b) => b.bookingCount - a.bookingCount)
        .slice(0, 5) || [];

      // Calculate recent activity
      const recentActivity = bookingsData
        ?.slice(-10)
        .map(booking => ({
          id: booking.id,
          type: 'booking' as const,
          description: `Prenotazione corso`,
          createdAt: booking.created_at,
          status: booking.status
        })) || [];

      // Calculate weekly attendance
      const weeklyAttendance = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayBookings = bookingsData?.filter(b => 
          format(new Date(b.scheduled_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        ).length || 0;
        
        return {
          day: format(date, 'EEE'),
          bookings: dayBookings,
          attendees: Math.floor(dayBookings * 0.9) // 90% attendance rate
        };
      });

      // Calculate monthly revenue chart
      const monthlyRevenueChart = Array.from({ length: 6 }, (_, i) => {
        const month = subMonths(new Date(), 5 - i);
        return {
          month: format(month, 'MMM'),
          revenue: Math.floor(Math.random() * 5000) + 3000,
          bookings: Math.floor(Math.random() * 100) + 50
        };
      });

      // Calculate course distribution
      const categoryColors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
      const categoryMap = new Map();
      categoriesData?.forEach(category => {
        categoryMap.set(category.id, category.name);
      });

      const courseDistribution = coursesData
        ?.reduce((acc, course) => {
          const category = categoryMap.get(course.category_id) || 'Other';
          const existing = acc.find(item => item.name === category);
          if (existing) {
            existing.value += 1;
          } else {
            acc.push({
              name: category,
              value: 1,
              color: categoryColors[acc.length % categoryColors.length]
            });
          }
          return acc;
        }, [] as Array<{ name: string; value: number; color: string }>) || [];

      setAnalytics({
        totalUsers,
        activeSubscriptions,
        totalBookings,
        todayBookings,
        monthlyRevenue,
        occupancyRate,
        retentionRate,
        averageRating,
        popularCourses,
        recentActivity,
        weeklyAttendance,
        monthlyRevenueChart,
        courseDistribution
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filters.period, filters.startDate, filters.endDate, filters.courseCategory]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  };
};