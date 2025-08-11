import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Course {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  category_name?: string;
  category_icon?: string;
  instructor_id: string;
  instructor_name?: string;
  max_participants: number;
  duration_minutes: number;
  difficulty_level: number | null;
  credits_required: number;
  image_url: string | null;
  is_active: boolean;
  schedules: Array<{
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room_name: string | null;
  }>;
  current_participants?: number;
}

export const useCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCourses = async () => {
    try {
      setLoading(true);
      
      // Get courses with instructor and category info
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          instructors(
            id,
            profiles(first_name, last_name)
          ),
          course_categories(
            name,
            icon_name
          ),
          course_schedules(
            id,
            day_of_week,
            start_time,
            end_time,
            room_name,
            is_active
          )
        `)
        .eq('is_active', true)
        .eq('course_schedules.is_active', true);

      if (coursesError) throw coursesError;

      // Transform data to match our interface
      const transformedCourses: Course[] = await Promise.all(
        (coursesData || []).map(async (course) => {
          // Get current participants count
          const { count: participantCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .eq('status', 'confirmed');

          return {
            id: course.id,
            name: course.name,
            description: course.description,
            category_id: course.category_id,
            category_name: course.course_categories?.name,
            category_icon: course.course_categories?.icon_name,
            instructor_id: course.instructor_id,
            instructor_name: (course.instructors as any)?.profiles 
              ? `${(course.instructors as any).profiles.first_name || ''} ${(course.instructors as any).profiles.last_name || ''}`.trim()
              : 'Non specificato',
            max_participants: course.max_participants,
            duration_minutes: course.duration_minutes,
            difficulty_level: course.difficulty_level,
            credits_required: course.credits_required,
            image_url: course.image_url,
            is_active: course.is_active,
            schedules: course.course_schedules || [],
            current_participants: participantCount || 0
          };
        })
      );

      setCourses(transformedCourses);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const bookCourse = async (courseId: string, date: string, time: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        course_id: courseId,
        scheduled_date: date,
        scheduled_time: time,
        status: 'confirmed',
        credits_used: 1 // You might want to get this from the course data
      });

    if (error) throw error;
    
    // Refresh courses to update participant count
    fetchCourses();
  };

  const cancelBooking = async (courseId: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'confirmed');

    if (error) throw error;
    
    // Refresh courses to update participant count
    fetchCourses();
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return {
    courses,
    loading,
    error,
    refetch: fetchCourses,
    bookCourse,
    cancelBooking
  };
};