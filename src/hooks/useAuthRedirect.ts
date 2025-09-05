import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Hook per gestire i redirect automatici basati sullo stato di autenticazione
 */
export const useAuthRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Wait for auth to be fully loaded AND user data to be complete
    if (loading) {
      console.log('AuthRedirect: Still loading auth...');
      return;
    }
    
    // If user is authenticated but we don't have complete user data yet, wait
    if (isAuthenticated && (!user || user.role === undefined)) {
      console.log('AuthRedirect: User authenticated but role not loaded yet, waiting...', { 
        isAuthenticated, 
        hasUser: !!user, 
        userRole: user?.role 
      });
      return;
    }

    console.log('AuthRedirect: Processing redirect', { 
      isAuthenticated, 
      userRole: user?.role, 
      currentPath: location.pathname,
      isMobile 
    });

    const currentPath = location.pathname;
    
    // Pagine pubbliche accessibili a tutti gli utenti autenticati
    const publicPaths = ['/auth', '/', '/shop', '/i-miei-corsi', '/subscriptions', '/chat', '/medical-certificate', '/booking-history', '/user-settings'];
    
    // Se l'utente è autenticato e si trova sulla pagina auth, redirect basato sul ruolo
    if (isAuthenticated && currentPath === '/auth') {
      if (user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user?.role === 'gym_owner') {
        // Su mobile vai direttamente al calendario, su desktop alla dashboard
        const targetRoute = isMobile ? '/owner/schedule' : '/owner';
        console.log('AuthRedirect: Redirecting gym_owner to', targetRoute);
        navigate(targetRoute, { replace: true });
      } else if (user?.role === 'instructor') {
        // Super-istruttori vanno su owner/schedule su mobile, istruttori normali su instructor/schedule
        const hasOwnerPrivileges = user?.has_owner_privileges;
        const targetRoute = isMobile 
          ? (hasOwnerPrivileges ? '/owner/schedule' : '/instructor/schedule')
          : (hasOwnerPrivileges ? '/owner' : '/instructor');
        console.log('AuthRedirect: Redirecting instructor to', targetRoute, { hasOwnerPrivileges, isMobile });
        navigate(targetRoute, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }

    // Se l'utente è autenticato e si trova sulla homepage, redirect basato sul ruolo
    if (isAuthenticated && currentPath === '/') {
      if (user?.role === 'admin') {
        navigate('/admin', { replace: true });
        return;
      } else if (user?.role === 'gym_owner') {
        // Su mobile vai direttamente al calendario, su desktop alla dashboard
        const targetRoute = isMobile ? '/owner/schedule' : '/owner';
        console.log('AuthRedirect: Redirecting gym_owner from homepage to', targetRoute);
        navigate(targetRoute, { replace: true });
        return;
      } else if (user?.role === 'instructor') {
        // Super-istruttori vanno su owner/schedule su mobile, istruttori normali su instructor/schedule
        const hasOwnerPrivileges = user?.has_owner_privileges;
        const targetRoute = isMobile 
          ? (hasOwnerPrivileges ? '/owner/schedule' : '/instructor/schedule')
          : (hasOwnerPrivileges ? '/owner' : '/instructor');
        console.log('AuthRedirect: Redirecting instructor from homepage to', targetRoute, { hasOwnerPrivileges, isMobile });
        navigate(targetRoute, { replace: true });
        return;
      }
      // Gli utenti normali rimangono sulla homepage
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

    if (currentPath.startsWith('/owner') && !(user?.role === 'gym_owner' || user?.role === 'admin' || (user?.role === 'instructor' && user?.has_owner_privileges))) {
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