import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  city?: string;
  profile_picture_url?: string;
  role: 'admin' | 'gym_owner' | 'instructor' | 'basic_user';
  gym_id?: string;
  gym_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (userData: RegisterData) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isGymOwner: boolean;
  isInstructor: boolean;
  loading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  city?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile and role data
  const fetchUserData = async (userId: string): Promise<User | null> => {
    try {
      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get role data
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!profile || !userRole) return null;

      // For now, return basic user data - we'll add gym data later
      return {
        id: userId,
        email: session?.user?.email || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone,
        city: profile.city,
        profile_picture_url: profile.profile_picture_url,
        role: userRole.role as 'admin' | 'gym_owner' | 'instructor' | 'basic_user',
        gym_id: undefined,
        gym_name: undefined,
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          const userData = await fetchUserData(session.user.id);
          setUser(userData);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        fetchUserData(session.user.id).then(userData => {
          setUser(userData);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Errore di connessione. Riprova più tardi.' };
    }
  };

  const register = async (userData: RegisterData): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone,
            city: userData.city,
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Errore di connessione. Riprova più tardi.' };
    }
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;

    try {
      // Update profile data
      const profileUpdate: any = {};
      if (userData.first_name !== undefined) profileUpdate.first_name = userData.first_name;
      if (userData.last_name !== undefined) profileUpdate.last_name = userData.last_name;
      if (userData.phone !== undefined) profileUpdate.phone = userData.phone;
      if (userData.city !== undefined) profileUpdate.city = userData.city;
      if (userData.profile_picture_url !== undefined) profileUpdate.profile_picture_url = userData.profile_picture_url;

      if (Object.keys(profileUpdate).length > 0) {
        await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('user_id', user.id);
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, ...userData } : null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!session,
    isAdmin: user?.role === 'admin',
    isGymOwner: user?.role === 'gym_owner',
    isInstructor: user?.role === 'instructor',
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};