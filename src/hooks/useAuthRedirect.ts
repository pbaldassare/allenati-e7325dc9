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
    
    // Se l'utente è autenticato e si trova sulla pagina auth, redirect basato sul ruolo
    if (isAuthenticated && currentPath === '/auth') {
      if (user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user?.role === 'gym_owner') {
        navigate('/owner', { replace: true });
      } else if (user?.role === 'instructor') {
        navigate('/instructor', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }

    // Se l'utente è autenticato e si trova sulla home, redirect basato sul ruolo
    if (isAuthenticated && currentPath === '/') {
      if (user?.role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      } else if (user?.role === 'gym_owner') {
        navigate('/owner', { replace: true });
        return;
      } else if (user?.role === 'instructor') {
        navigate('/instructor', { replace: true });
        return;
      }
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

    // Se l'utente è gym owner, può accedere alle pagine owner (anche admin)
    if (currentPath.startsWith('/owner') && !(user?.role === 'gym_owner' || user?.role === 'admin')) {
      navigate('/', { replace: true });
      return;
    }

    // Se l'utente è instructor, può accedere alle pagine instructor (anche admin)
    if (currentPath.startsWith('/instructor') && !(user?.role === 'instructor' || user?.role === 'admin')) {
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