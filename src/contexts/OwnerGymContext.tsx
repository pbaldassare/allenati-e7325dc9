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
  const { user, hasOwnerPrivileges } = useAuth();

  const fetchOwnerGyms = async () => {
    console.log('🏢 OwnerGymContext - fetchOwnerGyms START:', {
      user: user?.id,
      hasOwnerPrivileges,
      timestamp: new Date().toISOString()
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

      // Get gym IDs owned by user
      const { data: gymIds, error: idsError } = await supabase.rpc('get_user_owned_gyms', {
        _user_id: user.id
      });

      console.log('🔍 Owned gym IDs query:', {
        gymIds,
        error: idsError,
        count: gymIds?.length || 0
      });

      if (idsError) {
        console.error('❌ Error fetching owned gym IDs:', idsError);
        toast.error('Errore nel caricamento delle palestre');
        return;
      }

      if (!gymIds || gymIds.length === 0) {
        setOwnedGyms([]);
        setSelectedGymState(null);
        return;
      }

      // Fetch gym details
      const { data: gyms, error: gymsError } = await supabase
        .from('gyms')
        .select('id, name, description, logo_url, address, city, phone, email')
        .in('id', gymIds)
        .eq('is_active', true)
        .order('name');

      if (gymsError) {
        console.error('Error fetching gyms:', gymsError);
        toast.error('Errore nel caricamento dei dettagli delle palestre');
        return;
      }

      console.log('✅ Gyms loaded successfully:', {
        count: gyms?.length || 0,
        gyms: gyms?.map(g => ({ id: g.id, name: g.name }))
      });

      setOwnedGyms(gyms || []);

      // Auto-select gym
      if (gyms && gyms.length > 0) {
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
      console.log('🏢 OwnerGymContext - fetchOwnerGyms END');
    }
  };

  const setSelectedGym = (gym: Gym) => {
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