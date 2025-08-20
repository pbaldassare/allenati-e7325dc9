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

  const fetchUserGyms = async (retry = false, forceRefresh = false) => {
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

    // Add strategic delay for auth stabilization on first load
    if (!retry && !forceRefresh) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      setLoading(true);
      console.log('GymContext: Fetching gyms for user ID:', user.id);
      console.log('GymContext: Auth status - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);
      console.log('GymContext: Current auth.uid():', (await supabase.auth.getUser()).data.user?.id);
      
      // Ensure we have a fresh session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('GymContext: No valid session found');
        setUserGyms([]);
        setLoading(false);
        return;
      }
      
      // Get user's gym memberships and fetch gym details separately
      const { data: memberships, error: membershipsError } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipsError) {
        console.error('GymContext: Error fetching memberships:', membershipsError);
        
        // Enhanced retry logic with longer delays
        if (!retry && retryCount < 5) {
          console.log(`GymContext: Retrying query (attempt ${retryCount + 1}/5) in 2 seconds...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => fetchUserGyms(true), 2000);
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
        
        // If no memberships found and this is not a retry, try again
        if (!retry && retryCount < 3) {
          console.log(`GymContext: No memberships found, retrying (attempt ${retryCount + 1}/3) in 3 seconds...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => fetchUserGyms(true), 3000);
          return;
        }
        
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
      
      // Retry on unexpected errors
      if (!retry && retryCount < 3) {
        console.log(`GymContext: Unexpected error, retrying (attempt ${retryCount + 1}/3) in 2 seconds...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchUserGyms(true), 2000);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshGyms = async () => {
    console.log('GymContext: Force refreshing gyms...');
    setRetryCount(0); // Reset retry count
    await fetchUserGyms(false, true); // Force refresh
  };

  useEffect(() => {
    // Only fetch when auth is fully initialized
    if (!authLoading && isAuthenticated && user) {
      console.log('GymContext: useEffect triggered - Auth initialized, starting gym fetch...');
      // Add small delay to ensure session is stable
      const timer = setTimeout(() => {
        fetchUserGyms();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user?.id, authLoading, isAuthenticated]);

  // Auto-refresh every 30 seconds if no gyms are loaded and user is authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && userGyms.length === 0 && !loading) {
      console.log('GymContext: No gyms loaded, setting up auto-refresh...');
      const autoRefreshTimer = setInterval(() => {
        console.log('GymContext: Auto-refreshing due to empty gyms...');
        fetchUserGyms(false, true);
      }, 30000);
      
      return () => clearInterval(autoRefreshTimer);
    }
  }, [authLoading, isAuthenticated, user, userGyms.length, loading]);

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