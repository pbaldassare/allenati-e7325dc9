import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { setExternalUserId, removeExternalUserId } from '@/lib/onesignal';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  fiscal_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  belt: string | null;
  role: 'admin' | 'gym_owner' | 'instructor' | 'basic_user';
  gym_id?: string;
  gym_name?: string;
  has_owner_privileges?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (userData: RegisterData) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  fetchUserData: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isGymOwner: boolean;
  isInstructor: boolean;
  hasOwnerPrivileges: boolean;
  loading: boolean;
  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch user profile and role data
  const fetchUserDataInternal = async (userId: string, userEmail?: string): Promise<User | null> => {
    try {
      console.log('AuthContext: Fetching user data for ID:', userId);
      console.log('AuthContext: Current session:', session);
      
      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('AuthContext: Error fetching profile:', profileError);
        return null;
      }

      console.log('AuthContext: Profile data found:', profile);

      // Get role data using the new utility function
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: userId });

      const role = roleData || 'basic_user';

      // Get gym data if user is instructor or gym_owner
      let gymId: string | undefined;
      let gymName: string | undefined;
      let hasOwnerPrivileges = false;

      if (role === 'instructor') {
        console.log('AuthContext: Loading instructor data for user:', userId);
        
        // Get instructor data - use maybeSingle for more resilient loading
        const { data: instructorData, error: instructorError } = await supabase
          .from('instructors')
          .select('id, gym_id, gyms(name)')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (instructorError) {
          console.error('AuthContext: Error fetching instructor data:', instructorError);
        }

        if (instructorData) {
          console.log('AuthContext: Found instructor data:', instructorData);
          gymId = instructorData.gym_id;
          gymName = instructorData.gyms?.name;
          
          // Check owner privileges from instructor_gym_assignments
          const { data: assignmentData, error: assignmentError } = await supabase
            .from('instructor_gym_assignments')
            .select('has_owner_privileges')
            .eq('instructor_id', instructorData.id)
            .eq('gym_id', instructorData.gym_id)
            .eq('is_active', true)
            .maybeSingle();
          
          if (assignmentError) {
            console.error('AuthContext: Error fetching assignment data:', assignmentError);
          }
          
          hasOwnerPrivileges = assignmentData?.has_owner_privileges || false;
          console.log('AuthContext: Instructor has owner privileges:', hasOwnerPrivileges);
        } else {
          console.log('AuthContext: No instructor data found for user');
        }
      } else if (role === 'gym_owner') {
        // For gym owners, set hasOwnerPrivileges = true
        // The OwnerGymContext will handle loading owned gyms using get_user_owned_gyms()
        hasOwnerPrivileges = true;
      }

      return {
        id: userId,
        email: userEmail || '',
        first_name: profile.first_name,
        last_name: profile.last_name,
        nickname: profile.nickname,
        phone: profile.phone,
        gender: profile.gender,
        date_of_birth: profile.date_of_birth,
        address: profile.address,
        city: profile.city,
        postal_code: profile.postal_code,
        fiscal_code: profile.fiscal_code,
        emergency_contact_name: profile.emergency_contact_name,
        emergency_contact_phone: profile.emergency_contact_phone,
        bio: profile.bio,
        profile_picture_url: profile.profile_picture_url,
        belt: profile.belt,
        role: role as 'admin' | 'gym_owner' | 'instructor' | 'basic_user',
        gym_id: gymId,
        gym_name: gymName,
        has_owner_privileges: hasOwnerPrivileges,
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Public fetchUserData function for external use
  const fetchUserData = async () => {
    if (!session?.user) return;
    const userData = await fetchUserDataInternal(session.user.id, session.user.email);
    setUser(userData);
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(() => {
            fetchUserDataInternal(session.user.id, session.user.email).then(userData => {
              setUser(userData);
              setLoading(false);
              setInitialized(true);

              // Link user to OneSignal
              setExternalUserId(session.user.id);
              
              // Check if it's a new user and show welcome modal  
              if (event === 'SIGNED_UP' as AuthChangeEvent) {
                const hasSeenWelcome = localStorage.getItem(`hasSeenWelcome_${session.user.id}`);
                if (!hasSeenWelcome) {
                  setShowWelcomeModal(true);
                  localStorage.setItem(`hasSeenWelcome_${session.user.id}`, 'true');
                }
              }
            });
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Initial session check:', session);
      setSession(session);
      
      if (session?.user) {
        console.log('AuthContext: Found existing session for user:', session.user.id);
        fetchUserDataInternal(session.user.id, session.user.email).then(userData => {
          setUser(userData);
          setLoading(false);
          setInitialized(true);
        });
      } else {
        console.log('AuthContext: No existing session found');
        setLoading(false);
        setInitialized(true);
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
          return { error: 'Problema con l\'account. Contatta l\'assistenza.' };
        }
        return { error: 'Errore di accesso. Verifica le credenziali e riprova.' };
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
    try {
      setLoading(true);
      
      // Clear local state first
      setUser(null);
      setSession(null);

      // Unlink from OneSignal
      removeExternalUserId();
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // Even if signOut fails (session not found), we still redirect
      // This handles cases where the session has already expired
      if (error && !error.message.includes('session_not_found')) {
        console.warn('Logout warning:', error.message);
      }
      
      // Force navigation to auth page
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even on error, clear state and redirect
      setUser(null);
      setSession(null);
      window.location.href = '/auth';
    } finally {
      setLoading(false);
    }
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
    fetchUserData,
    isAuthenticated: !!session,
    isAdmin: user?.role === 'admin',
    isGymOwner: user?.role === 'gym_owner',
    isInstructor: user?.role === 'instructor',
    hasOwnerPrivileges: user?.has_owner_privileges || false,
    loading,
    showWelcomeModal,
    setShowWelcomeModal,
  };

  // Don't render children until the provider is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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