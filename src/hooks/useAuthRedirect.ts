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
    
    // Se l'utente è autenticato e si trova sulla pagina auth, redirect alla home
    if (isAuthenticated && currentPath === '/auth') {
      navigate('/', { replace: true });
      return;
    }

    // Se l'utente non è autenticato e non si trova su una pagina pubblica
    const publicPaths = ['/auth', '/'];
    if (!isAuthenticated && !publicPaths.includes(currentPath)) {
      navigate('/auth', { replace: true });
      return;
    }

    // Se l'utente è admin, può accedere alle pagine admin
    if (currentPath.startsWith('/admin') && user?.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }
  }, [isAuthenticated, loading, user, navigate, location.pathname]);

  return {
    isAuthenticated,
    loading,
    user
  };
};