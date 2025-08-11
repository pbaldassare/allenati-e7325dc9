import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminSubdomain, isCustomAdminDomain, getAdminUrl, getMainAppUrl } from '@/utils/subdomain';

export type AppRole = 'admin' | 'gym_owner' | 'instructor' | 'basic_user';

export const useSubdomainAccess = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const isOnAdminSubdomain = isAdminSubdomain() || isCustomAdminDomain();

  const userRole = user?.role as AppRole;
  
  // Define which roles can access backoffice
  const backofficeRoles: AppRole[] = ['admin', 'gym_owner'];
  const canAccessBackoffice = userRole && backofficeRoles.includes(userRole);
  
  // Define which roles should be on main app
  const mainAppRoles: AppRole[] = ['gym_owner', 'instructor', 'basic_user'];
  const shouldBeOnMainApp = userRole && mainAppRoles.includes(userRole);

  const performRedirect = () => {
    if (loading || !isAuthenticated || !userRole) return;

    // Admin should always be on admin subdomain
    if (userRole === 'admin' && !isOnAdminSubdomain) {
      window.location.href = getAdminUrl(window.location.pathname);
      return;
    }

    // Non-backoffice users should not be on admin subdomain
    if (!canAccessBackoffice && isOnAdminSubdomain) {
      window.location.href = getMainAppUrl('/');
      return;
    }
  };

  useEffect(() => {
    performRedirect();
  }, [userRole, isOnAdminSubdomain, isAuthenticated, loading]);

  return {
    userRole,
    isOnAdminSubdomain,
    canAccessBackoffice,
    shouldBeOnMainApp,
    isAuthenticated,
    loading
  };
};