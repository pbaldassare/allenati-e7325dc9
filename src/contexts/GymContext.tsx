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
  const { user } = useAuth();
  const [selectedGym, setSelectedGymState] = useState<Gym | null>(null);
  const [userGyms, setUserGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  const setSelectedGym = (gym: Gym | null) => {
    setSelectedGymState(gym);
    // Persist selection in localStorage
    if (gym) {
      localStorage.setItem('selectedGymId', gym.id);
    } else {
      localStorage.removeItem('selectedGymId');
    }
  };

  const fetchUserGyms = async () => {
    if (!user) {
      setUserGyms([]);
      setSelectedGymState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get user's gym memberships and fetch gym details separately
      const { data: memberships, error: membershipsError } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipsError) {
        console.error('Error fetching memberships:', membershipsError);
        setUserGyms([]);
        setLoading(false);
        return;
      }

      console.log('User memberships:', memberships);

      if (!memberships || memberships.length === 0) {
        setUserGyms([]);
        setLoading(false);
        return;
      }

      // Get gym details for each membership
      const gymIds = memberships.map(m => m.gym_id);
      const { data: gyms, error: gymsError } = await supabase
        .from('gyms')
        .select('id, name, description, logo_url')
        .in('id', gymIds)
        .eq('is_active', true);

      if (gymsError) {
        console.error('Error fetching gyms:', gymsError);
        setUserGyms([]);
        setLoading(false);
        return;
      }

      setUserGyms(gyms || []);
      console.log('User gyms loaded:', gyms);

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
      console.error('Error in fetchUserGyms:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshGyms = async () => {
    await fetchUserGyms();
  };

  useEffect(() => {
    fetchUserGyms();
  }, [user]);

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