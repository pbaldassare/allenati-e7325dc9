import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface Gym {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
}

interface OwnerGymContextType {
  ownedGyms: Gym[];
  selectedGym: Gym | null;
  setSelectedGym: (gym: Gym) => void;
  loading: boolean;
  refreshOwnerGyms: () => Promise<void>;
}

const OwnerGymContext = createContext<OwnerGymContextType | undefined>(undefined);

interface OwnerGymProviderProps {
  children: ReactNode;
}

const SELECTED_GYM_KEY = 'selectedOwnerGym';

export const OwnerGymProvider: React.FC<OwnerGymProviderProps> = ({ children }) => {
  const [ownedGyms, setOwnedGyms] = useState<Gym[]>([]);
  const [selectedGym, setSelectedGymState] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user, hasOwnerPrivileges } = useAuth();

  const fetchOwnerGyms = async () => {
    // Prevent multiple concurrent calls
    if (isRefreshing) {
      console.log('🏢 OwnerGymContext - fetchOwnerGyms SKIPPED (already refreshing)');
      return;
    }
    console.log('🏢 OwnerGymContext - fetchOwnerGyms START:', {
      user: user?.id,
      hasOwnerPrivileges,
      timestamp: new Date().toISOString(),
      userEmail: user?.email
    });

    if (!user || !hasOwnerPrivileges) {
      console.log('❌ No user or owner privileges, clearing gyms');
      setOwnedGyms([]);
      setSelectedGymState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setIsRefreshing(true);

      // Get gym IDs owned by user (real ownership)
      const { data: ownedGymIds, error: ownedIdsError } = await supabase.rpc('get_user_owned_gyms', {
        _user_id: user.id
      });

      console.log('🔍 Owned gym IDs query:', {
        ownedGymIds,
        error: ownedIdsError,
        count: ownedGymIds?.length || 0
      });

      // Get gym IDs where user has instructor owner privileges
      const { data: instructorGymIds, error: instructorIdsError } = await supabase.rpc('get_instructor_gyms', {
        _user_id: user.id
      });

      console.log('🔍 Instructor gym IDs query:', {
        instructorGymIds,
        error: instructorIdsError,
        count: instructorGymIds?.length || 0
      });

      // Check which instructor gyms have owner privileges
      let superInstructorGymIds: string[] = [];
      if (instructorGymIds && instructorGymIds.length > 0) {
        for (const gymId of instructorGymIds) {
          const { data: hasPrivileges } = await supabase.rpc('instructor_has_owner_privileges_for_gym', {
            _user_id: user.id,
            _gym_id: gymId
          });
          
          if (hasPrivileges) {
            superInstructorGymIds.push(gymId);
          }
        }
      }

      console.log('🔍 Super instructor gym IDs:', {
        superInstructorGymIds,
        count: superInstructorGymIds.length
      });

      // Combine both types of gym access
      const allGymIds = [
        ...(ownedGymIds || []),
        ...superInstructorGymIds
      ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

      console.log('🔍 Combined gym IDs:', {
        allGymIds,
        count: allGymIds.length,
        breakdown: {
          owned: ownedGymIds?.length || 0,
          superInstructor: superInstructorGymIds.length,
          total: allGymIds.length
        }
      });

      if (ownedIdsError) {
        console.error('❌ Error fetching owned gym IDs:', ownedIdsError);
        toast.error('Errore nel caricamento delle palestre');
        return;
      }

      if (instructorIdsError) {
        console.error('❌ Error fetching instructor gym IDs:', instructorIdsError);
        // Don't return here, continue with owned gyms only
      }

      if (!allGymIds || allGymIds.length === 0) {
        console.log('❌ No gyms available for user');
        setOwnedGyms([]);
        setSelectedGymState(null);
        return;
      }

      // Fetch gym details
      const { data: gyms, error: gymsError } = await supabase
        .from('gyms')
        .select('id, name, description, logo_url, address, city, phone, email')
        .in('id', allGymIds)
        .eq('is_active', true)
        .order('name');

      if (gymsError) {
        console.error('Error fetching gyms:', gymsError);
        toast.error('Errore nel caricamento dei dettagli delle palestre');
        return;
      }

      console.log('✅ Gyms loaded successfully:', {
        count: gyms?.length || 0,
        gyms: gyms?.map(g => ({ id: g.id, name: g.name })),
        currentSelectedGym: selectedGym?.name,
        currentSelectedGymId: selectedGym?.id
      });

      setOwnedGyms(gyms || []);

      // Auto-select gym with preservation logic
      if (gyms && gyms.length > 0) {
        // First check if current selectedGym is still valid
        const currentSelectedGym = selectedGym;
        const currentGymStillExists = currentSelectedGym && gyms.find(g => g.id === currentSelectedGym.id);
        
        if (currentGymStillExists) {
          console.log('🎯 Preserving current gym:', currentSelectedGym.name);
          // Update the selected gym data but keep the same selection
          const updatedCurrentGym = gyms.find(g => g.id === currentSelectedGym.id);
          if (updatedCurrentGym) {
            setSelectedGymState(updatedCurrentGym);
            localStorage.setItem(SELECTED_GYM_KEY, updatedCurrentGym.id);
          }
        } else {
          // Try to restore from localStorage
          const savedGymId = localStorage.getItem(SELECTED_GYM_KEY);
          const savedGym = gyms.find(g => g.id === savedGymId);
          
          if (savedGym) {
            console.log('🎯 Restored saved gym:', savedGym.name);
            setSelectedGymState(savedGym);
          } else {
            // Default to first gym
            console.log('🎯 Selected first gym:', gyms[0].name);
            setSelectedGymState(gyms[0]);
            localStorage.setItem(SELECTED_GYM_KEY, gyms[0].id);
          }
        }
      } else {
        console.log('❌ No gyms available');
        setSelectedGymState(null);
      }
    } catch (error) {
      console.error('❌ Error in fetchOwnerGyms:', error);
      toast.error('Errore nel caricamento delle palestre');
      setOwnedGyms([]);
      setSelectedGymState(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      console.log('🏢 OwnerGymContext - fetchOwnerGyms END');
    }
  };

  const setSelectedGym = (gym: Gym) => {
    console.log('🔄 Changing selected gym:', {
      from: selectedGym?.name,
      to: gym.name,
      fromId: selectedGym?.id,
      toId: gym.id
    });
    setSelectedGymState(gym);
    localStorage.setItem(SELECTED_GYM_KEY, gym.id);
  };

  const refreshOwnerGyms = async () => {
    await fetchOwnerGyms();
  };

  useEffect(() => {
    fetchOwnerGyms();
  }, [user, hasOwnerPrivileges]);

  const value: OwnerGymContextType = {
    ownedGyms,
    selectedGym,
    setSelectedGym,
    loading,
    refreshOwnerGyms
  };

  return (
    <OwnerGymContext.Provider value={value}>
      {children}
    </OwnerGymContext.Provider>
  );
};

export const useOwnerGym = (): OwnerGymContextType => {
  const context = useContext(OwnerGymContext);
  if (context === undefined) {
    throw new Error('useOwnerGym must be used within an OwnerGymProvider');
  }
  return context;
};