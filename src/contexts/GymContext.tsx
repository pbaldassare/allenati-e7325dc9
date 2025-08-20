import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Gym {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
}

interface GymContextType {
  selectedGym: Gym | null;
  userGyms: Gym[];
  setSelectedGym: (gym: Gym | null) => void;
  loading: boolean;
  refreshGyms: () => Promise<void>;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedGym, setSelectedGymState] = useState<Gym | null>(null);
  const [userGyms, setUserGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const setSelectedGym = (gym: Gym | null) => {
    setSelectedGymState(gym);
    // Persist selection in localStorage
    if (gym) {
      localStorage.setItem('selectedGymId', gym.id);
    } else {
      localStorage.removeItem('selectedGymId');
    }
  };

  const fetchUserGyms = async (retry = false) => {
    // Wait for auth to be fully initialized
    if (authLoading) {
      console.log('GymContext: Waiting for auth to initialize...');
      return;
    }

    // If not authenticated, clear gyms
    if (!isAuthenticated || !user) {
      console.log('GymContext: No authenticated user found, clearing gyms');
      setUserGyms([]);
      setSelectedGymState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('GymContext: Fetching gyms for user ID:', user.id);
      console.log('GymContext: Auth status - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);
      
      // Get user's gym memberships and fetch gym details separately
      const { data: memberships, error: membershipsError } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipsError) {
        console.error('GymContext: Error fetching memberships:', membershipsError);
        
        // If this is the first attempt and we get an error, try once more
        if (!retry && retryCount < 2) {
          console.log('GymContext: Retrying query in 1 second...');
          setRetryCount(prev => prev + 1);
          setTimeout(() => fetchUserGyms(true), 1000);
          return;
        }
        
        setUserGyms([]);
        setLoading(false);
        return;
      }

      console.log('GymContext: User memberships query result:', memberships);
      console.log('GymContext: Number of memberships found:', memberships?.length);

      if (!memberships || memberships.length === 0) {
        console.log('GymContext: No active memberships found');
        setUserGyms([]);
        setLoading(false);
        return;
      }

      // Get gym details for each membership
      const gymIds = memberships.map(m => m.gym_id);
      console.log('GymContext: Gym IDs to fetch:', gymIds);
      
      const { data: gyms, error: gymsError } = await supabase
        .from('gyms')
        .select('id, name, description, logo_url')
        .in('id', gymIds)
        .eq('is_active', true);

      if (gymsError) {
        console.error('GymContext: Error fetching gyms:', gymsError);
        setUserGyms([]);
        setLoading(false);
        return;
      }

      console.log('GymContext: Gyms query result:', gyms);
      setUserGyms(gyms || []);

      // Reset retry count on success
      setRetryCount(0);

      // Auto-select gym based on localStorage or first available
      const availableGyms = gyms || [];
      const savedGymId = localStorage.getItem('selectedGymId');
      if (savedGymId) {
        const savedGym = availableGyms.find(gym => gym.id === savedGymId);
        if (savedGym) {
          setSelectedGymState(savedGym);
        } else {
          // Saved gym not found, select first available
          if (availableGyms.length > 0) {
            setSelectedGymState(availableGyms[0]);
            localStorage.setItem('selectedGymId', availableGyms[0].id);
          }
        }
      } else {
        // No saved gym, select first available
        if (availableGyms.length > 0) {
          setSelectedGymState(availableGyms[0]);
          localStorage.setItem('selectedGymId', availableGyms[0].id);
        }
      }

    } catch (error) {
      console.error('GymContext: Error in fetchUserGyms:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshGyms = async () => {
    await fetchUserGyms();
  };

  useEffect(() => {
    // Only fetch when auth is fully initialized
    if (!authLoading) {
      fetchUserGyms();
    }
  }, [user, authLoading, isAuthenticated]);

  return (
    <GymContext.Provider
      value={{
        selectedGym,
        userGyms,
        setSelectedGym,
        loading,
        refreshGyms,
      }}
    >
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  const context = useContext(GymContext);
  if (context === undefined) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
}