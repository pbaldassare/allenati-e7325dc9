/**
 * Utility functions for handling subdomain detection and routing
 */
export const isLovableDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return hostname.includes('lovableproject.com');
};

export const isAdminSubdomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return hostname.startsWith('admin.');
};

export const isCustomAdminDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  // Check for custom admin domains like admin.allenati.me
  return hostname === 'admin.allenati.me' || hostname.startsWith('admin.') && !hostname.includes('lovableproject.com');
};

export const shouldShowAdminRoutes = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  console.log('🔧 Domain detection:', { 
    hostname,
    isLovable: isLovableDomain(),
    isAdminSubdomain: isAdminSubdomain(),
    isCustomAdmin: isCustomAdminDomain()
  });
  
  // Show admin routes if:
  // 1. On Lovable domain (for /admin/* routes)
  // 2. On admin subdomain (custom or lovable)
  return isLovableDomain() || isAdminSubdomain() || isCustomAdminDomain();
};

export const getAdminUrl = (path: string = '/'): string => {
  if (typeof window === 'undefined') return path;
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Se siamo già su admin subdomain, usa l'host corrente
  if (hostname.startsWith('admin.')) {
    return `${protocol}//${hostname}${path}`;
  }
  
  // Altrimenti, aggiungi il prefisso admin
  const adminHost = hostname.includes('localhost') 
    ? 'admin.localhost:8080' 
    : `admin.${hostname}`;
    
  return `${protocol}//${adminHost}${path}`;
};

export const getMainAppUrl = (path: string = '/'): string => {
  if (typeof window === 'undefined') return path;
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // Se siamo su admin subdomain, rimuovi il prefisso admin
  if (hostname.startsWith('admin.')) {
    const mainHost = hostname.replace('admin.', '');
    return `${protocol}//${mainHost}${path}`;
  }
  
  // Altrimenti usa l'host corrente
  return `${protocol}//${hostname}${path}`;
};

export const getAdminPath = (path: string): string => {
  if (typeof window === 'undefined') return path;
  
  const hostname = window.location.hostname;
  
  // Su domini custom admin (admin.allenati.me), non aggiungere /admin/
  if (hostname.startsWith('admin.') && !hostname.includes('lovableproject.com')) {
    return path;
  }
  
  // Su domini Lovable, aggiungere /admin/
  return `/admin${path}`;
};