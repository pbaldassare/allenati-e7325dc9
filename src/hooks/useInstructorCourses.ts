import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InstructorCourse {
  id: string;
  name: string;
  description: string;
  max_participants: number;
  duration_minutes: number;
  credits_required: number;
  is_active: boolean;
  category: {
    name: string;
    color_hex: string;
  };
  gym: {
    name: string;
  };
  schedules: {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    room_name: string;
  }[];
  current_bookings?: number;
}

export const useInstructorCourses = () => {
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, hasOwnerPrivileges } = useAuth();

  const fetchInstructorCourses = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      let coursesData;
      
      if (hasOwnerPrivileges) {
        // For super instructors, get user's gym ID and fetch ALL courses from that gym
        const { data: membership, error: membershipError } = await supabase
          .from('user_gym_memberships')
          .select('gym_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();
        
        if (membershipError || !membership) {
          throw new Error('Palestra non trovata');
        }
        
        const gymId = membership.gym_id;

        // Get all courses from the gym
        const { data: allCoursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            id,
            name,
            description,
            max_participants,
            duration_minutes,
            credits_required,
            is_active,
            category:course_categories(name, color_hex),
            gym:gyms(name),
            schedules:course_schedules(
              id,
              day_of_week,
              start_time,
              end_time,
              room_name
            )
          `)
          .eq('gym_id', gymId)
          .eq('is_active', true)
          .order('name');

        if (coursesError) throw coursesError;
        coursesData = allCoursesData;
      } else {
        // Regular instructor - get only their assigned courses
        const { data: instructor, error: instructorError } = await supabase
          .from('instructors')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (instructorError || !instructor) {
          throw new Error('Istruttore non trovato');
        }

        // Get courses assigned to this instructor
        const { data: instructorCoursesData, error: coursesError } = await supabase
          .from('courses')
          .select(`
            id,
            name,
            description,
            max_participants,
            duration_minutes,
            credits_required,
            is_active,
            category:course_categories(name, color_hex),
            gym:gyms(name),
            schedules:course_schedules(
              id,
              day_of_week,
              start_time,
              end_time,
              room_name
            )
          `)
          .eq('instructor_id', instructor.id)
          .eq('is_active', true)
          .order('name');

        if (coursesError) throw coursesError;
        coursesData = instructorCoursesData;
      }

      // Get current bookings count for each course
      const coursesWithBookings = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id)
            .eq('status', 'confirmed');

          return {
            ...course,
            current_bookings: count || 0
          };
        })
      );

      setCourses(coursesWithBookings);
    } catch (err) {
      console.error('Error fetching instructor courses:', err);
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei corsi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructorCourses();
  }, [user?.id]);

  return {
    courses,
    loading,
    error,
    refetch: fetchInstructorCourses
  };
};