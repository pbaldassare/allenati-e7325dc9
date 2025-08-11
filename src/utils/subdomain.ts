/**
 * Utility functions for handling subdomain detection and routing
 */
export const isAdminSubdomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return hostname.startsWith('admin.');
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