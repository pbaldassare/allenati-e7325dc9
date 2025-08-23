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
    
    // Pagine pubbliche accessibili a tutti gli utenti autenticati
    const publicPaths = ['/auth', '/', '/shop', '/i-miei-corsi', '/subscriptions', '/chat', '/medical-certificate', '/booking-history', '/user-settings'];
    
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

    // Se l'utente non è autenticato e non si trova su una pagina pubblica limitata
    const unauthenticatedPublicPaths = ['/auth', '/'];
    if (!isAuthenticated && !unauthenticatedPublicPaths.includes(currentPath)) {
      navigate('/auth', { replace: true });
      return;
    }

    // Controlli di accesso per aree riservate
    if (currentPath.startsWith('/admin') && user?.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }

    if (currentPath.startsWith('/owner') && !(user?.role === 'gym_owner' || user?.role === 'admin')) {
      navigate('/', { replace: true });
      return;
    }

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