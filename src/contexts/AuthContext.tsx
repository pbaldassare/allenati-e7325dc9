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
  const fetchUserData = async (userId: string, userEmail?: string): Promise<User | null> => {
    try {
      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Get role data using the new utility function
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: userId });

      const role = roleData || 'basic_user';

      // Get gym data if user is instructor or gym_owner
      let gymId: string | undefined;
      let gymName: string | undefined;

      if (role === 'instructor') {
        const { data: instructorData } = await supabase
          .from('instructors')
          .select('gym_id, gyms(name)')
          .eq('user_id', userId)
          .single();

        if (instructorData) {
          gymId = instructorData.gym_id;
          gymName = instructorData.gyms?.name;
        }
      } else if (role === 'gym_owner') {
        const { data: gymData } = await supabase
          .from('gyms')
          .select('id, name')
          .eq('owner_email', userEmail)
          .single();

        if (gymData) {
          gymId = gymData.id;
          gymName = gymData.name;
        }
      }

      return {
        id: userId,
        email: userEmail || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone,
        city: profile.city,
        profile_picture_url: profile.profile_picture_url,
        role: role as 'admin' | 'gym_owner' | 'instructor' | 'basic_user',
        gym_id: gymId,
        gym_name: gymName,
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            fetchUserData(session.user.id, session.user.email).then(userData => {
              setUser(userData);
              setLoading(false);
            });
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        fetchUserData(session.user.id, session.user.email).then(userData => {
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
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        // Friendly Italian error messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Email o password non corretti' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Conferma la tua email prima di accedere' };
        }
        return { error: error.message };
      }

      return {};
    } catch (error) {
      setLoading(false);
      return { error: 'Errore di connessione. Riprova più tardi.' };
    }
  };

  const register = async (userData: RegisterData): Promise<{ error?: string }> => {
    try {
      setLoading(true);
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
        setLoading(false);
        // Friendly Italian error messages
        if (error.message.includes('already registered')) {
          return { error: 'Questa email è già registrata' };
        }
        if (error.message.includes('Password should be')) {
          return { error: 'La password deve essere di almeno 6 caratteri' };
        }
        return { error: error.message };
      }

      setLoading(false);
      return {};
    } catch (error) {
      setLoading(false);
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