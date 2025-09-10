import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface InstructorGym {
  id: string;
  name: string;
  has_owner_privileges: boolean;
}

interface InstructorGymContextType {
  instructorGyms: InstructorGym[];
  selectedGymId: string | null;
  setSelectedGymId: (gymId: string | null) => void;
  hasOwnerPrivilegesForGym: (gymId: string) => boolean;
  loading: boolean;
  refreshGyms: () => Promise<void>;
}

const InstructorGymContext = createContext<InstructorGymContextType | undefined>(undefined);

export const InstructorGymProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isInstructor } = useAuth();
  const [instructorGyms, setInstructorGyms] = useState<InstructorGym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInstructorGyms = async () => {
    if (!user?.id) {
      console.log('InstructorGymContext: No user ID found');
      setInstructorGyms([]);
      setSelectedGymId(null);
      return;
    }

    // More resilient check - try to load gyms even if isInstructor is false
    // This handles cases where AuthContext might not have loaded instructor status yet
    console.log('InstructorGymContext: Loading gyms for user:', user.id, 'isInstructor:', isInstructor);

    try {
      setLoading(true);
      
      // Get all instructor records for this user (in case they have multiple)
      const { data: instructors, error: instructorError } = await supabase
        .from('instructors')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (instructorError) {
        console.error('Error fetching instructor records:', instructorError);
        setInstructorGyms([]);
        return;
      }

      if (!instructors || instructors.length === 0) {
        console.log('InstructorGymContext: No instructor records found for user:', user.id);
        
        // If isInstructor is false from AuthContext but we expected instructor data,
        // it might be a timing issue. Try direct role check as fallback
        if (!isInstructor) {
          console.log('InstructorGymContext: AuthContext says not instructor, trying direct role check...');
          const { data: roleData } = await supabase.rpc('get_user_role', { _user_id: user.id });
          
          if (roleData === 'instructor') {
            console.log('InstructorGymContext: Direct role check confirms instructor - retrying in 1 second...');
            // Retry after a delay to let AuthContext catch up
            setTimeout(() => {
              fetchInstructorGyms();
            }, 1000);
            return;
          }
        }
        
        setInstructorGyms([]);
        return;
      }

      // Get all instructor IDs
      const instructorIds = instructors.map(i => i.id);

      // Now fetch instructor assignments with gym details using all instructor IDs
      const { data: assignments, error } = await supabase
        .from('instructor_gym_assignments')
        .select(`
          gym_id,
          has_owner_privileges,
          gyms:gym_id (
            id,
            name
          )
        `)
        .in('instructor_id', instructorIds)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching instructor gyms:', error);
        return;
      }

      const gyms = assignments?.map(assignment => ({
        id: assignment.gym_id,
        name: assignment.gyms?.name || 'Unknown Gym',
        has_owner_privileges: assignment.has_owner_privileges
      })) || [];

      setInstructorGyms(gyms);
      
      // Auto-select gym from localStorage or first gym
      const savedGymId = localStorage.getItem(`selectedGymId_${user.id}`);
      if (savedGymId && gyms.find(g => g.id === savedGymId)) {
        setSelectedGymId(savedGymId);
      } else if (gyms.length > 0) {
        setSelectedGymId(gyms[0].id);
      }
    } catch (error) {
      console.error('Error in fetchInstructorGyms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetSelectedGymId = (gymId: string | null) => {
    setSelectedGymId(gymId);
    if (user?.id && gymId) {
      localStorage.setItem(`selectedGymId_${user.id}`, gymId);
    }
  };

  const hasOwnerPrivilegesForGym = (gymId: string): boolean => {
    const gym = instructorGyms.find(g => g.id === gymId);
    return gym?.has_owner_privileges || false;
  };

  useEffect(() => {
    fetchInstructorGyms();
  }, [user?.id, isInstructor]);

  const value: InstructorGymContextType = {
    instructorGyms,
    selectedGymId,
    setSelectedGymId: handleSetSelectedGymId,
    hasOwnerPrivilegesForGym,
    loading,
    refreshGyms: fetchInstructorGyms,
  };

  return (
    <InstructorGymContext.Provider value={value}>
      {children}
    </InstructorGymContext.Provider>
  );
};

export const useInstructorGym = () => {
  const context = useContext(InstructorGymContext);
  if (context === undefined) {
    throw new Error('useInstructorGym must be used within an InstructorGymProvider');
  }
  return context;
};