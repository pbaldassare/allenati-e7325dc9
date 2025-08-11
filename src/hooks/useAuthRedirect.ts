import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook per gestire i redirect automatici basati sullo stato di autenticazione
 */
export const useAuthRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const currentPath = location.pathname;
    
    console.log('🔐 useAuthRedirect: Checking path', { 
      currentPath, 
      isAuthenticated, 
      userRole: user?.role,
      loading 
    });
    
    // Se l'utente è autenticato e si trova sulla pagina auth, redirect alla home
    if (isAuthenticated && currentPath === '/auth') {
      console.log('🔐 useAuthRedirect: Authenticated user on auth page, redirecting to home');
      navigate('/', { replace: true });
      return;
    }

    // Se l'utente non è autenticato e non si trova su una pagina pubblica
    const publicPaths = ['/auth', '/'];
    if (!isAuthenticated && !publicPaths.includes(currentPath)) {
      console.log('🔐 useAuthRedirect: Unauthenticated user on protected page, redirecting to auth');
      navigate('/auth', { replace: true });
      return;
    }

    // Verificare l'accesso alle pagine admin - permettere sia admin che gym_owner
    if (currentPath.startsWith('/admin')) {
      const canAccessBackoffice = user?.role === 'admin' || user?.role === 'gym_owner';
      console.log('🔐 useAuthRedirect: Admin page access check', { 
        userRole: user?.role, 
        canAccessBackoffice 
      });
      
      if (!canAccessBackoffice) {
        console.log('🔐 useAuthRedirect: User cannot access backoffice, redirecting to home');
        navigate('/', { replace: true });
        return;
      }
    }
  }, [isAuthenticated, loading, user, navigate, location.pathname]);

  return {
    isAuthenticated,
    loading,
    user
  };
};