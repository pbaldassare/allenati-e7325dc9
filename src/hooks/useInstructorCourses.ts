import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorGym } from '@/contexts/InstructorGymContext';

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
  const { user } = useAuth();
  const { selectedGymId, hasOwnerPrivilegesForGym } = useInstructorGym();

  const fetchInstructorCourses = async () => {
    if (!user?.id || !selectedGymId) {
      setCourses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let coursesData;
      
      if (hasOwnerPrivilegesForGym(selectedGymId)) {
        // For super instructors, fetch ALL courses from the selected gym

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
          .eq('gym_id', selectedGymId)
          .eq('is_active', true)
          .order('name');

        if (coursesError) throw coursesError;
        coursesData = allCoursesData;
      } else {
        // Regular instructor - get instructor ID for the selected gym
        const instructorId = await supabase
          .rpc('get_instructor_id_for_gym', { 
            _user_id: user.id, 
            _gym_id: selectedGymId 
          });

        if (!instructorId.data) {
          throw new Error('Istruttore non trovato per questa palestra');
        }

        // Get courses assigned to this instructor in the selected gym
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
          .eq('instructor_id', instructorId.data)
          .eq('gym_id', selectedGymId)
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
  }, [user?.id, selectedGymId]);

  return {
    courses,
    loading,
    error,
    refetch: fetchInstructorCourses
  };
};