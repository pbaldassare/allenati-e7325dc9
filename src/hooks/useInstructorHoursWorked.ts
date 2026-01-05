import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InstructorHoursData {
  instructorId: string;
  instructorUserId: string;
  firstName: string;
  lastName: string;
  totalHours: number;
  sessionCount: number;
}

interface UseInstructorHoursWorkedResult {
  data: InstructorHoursData[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useInstructorHoursWorked = (
  gymId: string | undefined,
  startDate: Date | undefined,
  endDate: Date | undefined,
  instructorUserId?: string
): UseInstructorHoursWorkedResult => {
  const [data, setData] = useState<InstructorHoursData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => setRefetchTrigger(prev => prev + 1);

  useEffect(() => {
    const fetchData = async () => {
      if (!gymId || !startDate || !endDate) {
        setData([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Method 1: Get instructor IDs from instructor_gym_assignments
        const { data: gymAssignments } = await supabase
          .from('instructor_gym_assignments')
          .select('instructor_id')
          .eq('gym_id', gymId)
          .eq('is_active', true);

        // Method 2: Get instructor IDs from legacy instructors.gym_id
        const { data: directInstructors } = await supabase
          .from('instructors')
          .select('id')
          .eq('gym_id', gymId)
          .eq('is_active', true);

        // Combine both sources (deduplicate)
        const assignmentIds = gymAssignments?.map(a => a.instructor_id) || [];
        const directIds = directInstructors?.map(i => i.id) || [];
        const allInstructorIds = [...new Set([...assignmentIds, ...directIds])];

        if (allInstructorIds.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // Get instructors from combined IDs
        let instructorQuery = supabase
          .from('instructors')
          .select('id, user_id, first_name, last_name')
          .in('id', allInstructorIds)
          .eq('is_active', true);

        // If filtering by specific instructor
        if (instructorUserId) {
          instructorQuery = instructorQuery.eq('user_id', instructorUserId);
        }

        const { data: instructors, error: instructorsError } = await instructorQuery;

        if (instructorsError) throw instructorsError;
        if (!instructors || instructors.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // Get profiles for instructor names
        const userIds = instructors.map(i => i.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        // Get courses for these instructors in this gym
        const instructorIds = instructors.map(i => i.id);
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id, instructor_id')
          .eq('gym_id', gymId)
          .in('instructor_id', instructorIds);

        if (coursesError) throw coursesError;
        if (!courses || courses.length === 0) {
          // No courses, all instructors have 0 hours
          const result = instructors.map(instructor => {
            const profile = profileMap.get(instructor.user_id);
            return {
              instructorId: instructor.id,
              instructorUserId: instructor.user_id,
              firstName: profile?.first_name || instructor.first_name || 'N/D',
              lastName: profile?.last_name || instructor.last_name || '',
              totalHours: 0,
              sessionCount: 0,
            };
          });
          setData(result);
          setLoading(false);
          return;
        }

        // Get sessions with at least one confirmed/completed booking
        const courseIds = courses.map(c => c.id);
        const { data: sessions, error: sessionsError } = await supabase
          .from('course_sessions')
          .select('id, course_id, start_time, end_time, session_date')
          .in('course_id', courseIds)
          .gte('session_date', startDateStr)
          .lte('session_date', endDateStr)
          .lte('session_date', new Date().toISOString().split('T')[0]);

        if (sessionsError) throw sessionsError;
        if (!sessions || sessions.length === 0) {
          const result = instructors.map(instructor => {
            const profile = profileMap.get(instructor.user_id);
            return {
              instructorId: instructor.id,
              instructorUserId: instructor.user_id,
              firstName: profile?.first_name || instructor.first_name || 'N/D',
              lastName: profile?.last_name || instructor.last_name || '',
              totalHours: 0,
              sessionCount: 0,
            };
          });
          setData(result);
          setLoading(false);
          return;
        }

        // Get bookings to filter sessions with participants
        const sessionIds = sessions.map(s => s.id);
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('session_id')
          .in('session_id', sessionIds)
          .in('status', ['confirmed', 'completed']);

        if (bookingsError) throw bookingsError;

        // Set of session IDs that have at least one participant
        const sessionsWithParticipants = new Set(bookings?.map(b => b.session_id) || []);

        // Create course to instructor mapping
        const courseToInstructor = new Map(courses.map(c => [c.id, c.instructor_id]));

        // Calculate hours per instructor
        const instructorStats = new Map<string, { hours: number; sessions: number }>();

        sessions.forEach(session => {
          if (!sessionsWithParticipants.has(session.id)) return;

          const instructorId = courseToInstructor.get(session.course_id);
          if (!instructorId) return;

          // Calculate session duration in hours
          const [startH, startM] = session.start_time.split(':').map(Number);
          const [endH, endM] = session.end_time.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          const durationHours = (endMinutes - startMinutes) / 60;

          const current = instructorStats.get(instructorId) || { hours: 0, sessions: 0 };
          instructorStats.set(instructorId, {
            hours: current.hours + durationHours,
            sessions: current.sessions + 1,
          });
        });

        // Build result
        const result = instructors.map(instructor => {
          const profile = profileMap.get(instructor.user_id);
          const stats = instructorStats.get(instructor.id) || { hours: 0, sessions: 0 };
          return {
            instructorId: instructor.id,
            instructorUserId: instructor.user_id,
            firstName: profile?.first_name || instructor.first_name || 'N/D',
            lastName: profile?.last_name || instructor.last_name || '',
            totalHours: Math.round(stats.hours * 10) / 10,
            sessionCount: stats.sessions,
          };
        });

        // Sort by hours descending
        result.sort((a, b) => b.totalHours - a.totalHours);

        setData(result);
      } catch (err: any) {
        console.error('Error fetching instructor hours:', err);
        setError(err.message || 'Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [gymId, startDate, endDate, instructorUserId, refetchTrigger]);

  return { data, loading, error, refetch };
};
