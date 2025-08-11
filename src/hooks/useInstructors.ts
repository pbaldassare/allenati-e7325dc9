import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Instructor {
  id: string;
  user_id: string;
  bio: string | null;
  specializations: string[] | null;
  certifications: string[] | null;
  experience_years: number | null;
  hourly_rate: number | null;
  is_active: boolean;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export const useInstructors = () => {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('instructors')
        .select(`
          id,
          user_id,
          bio,
          specializations,
          certifications,
          experience_years,
          hourly_rate,
          is_active
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Fetch profiles separately
      const userIds = data?.map(instructor => instructor.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine instructors with profiles
      const instructorsWithProfiles = data?.map(instructor => {
        const profile = profilesData?.find(p => p.user_id === instructor.user_id);
        return {
          ...instructor,
          profiles: {
            first_name: profile?.first_name || 'Nome',
            last_name: profile?.last_name || 'Cognome'
          }
        };
      }) || [];

      setInstructors(instructorsWithProfiles);
    } catch (err) {
      console.error('Error fetching instructors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch instructors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructors();
  }, []);

  return {
    instructors,
    loading,
    error,
    refetch: fetchInstructors
  };
};