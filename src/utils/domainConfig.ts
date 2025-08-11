/**
 * Domain-specific configuration for meta tags and SEO
 */

export interface DomainConfig {
  title: string;
  description: string;
  keywords: string;
  themeColor: string;
  appleTouchIcon: string;
}

export const getDomainConfig = (): DomainConfig => {
  if (typeof window === 'undefined') {
    return getMainAppConfig();
  }

  const hostname = window.location.hostname;
  
  if (hostname.startsWith('admin.')) {
    return getAdminConfig();
  }
  
  return getMainAppConfig();
};

const getMainAppConfig = (): DomainConfig => ({
  title: 'Allenati.me - La tua palestra digitale',
  description: 'Prenota corsi, monitora i tuoi progressi e connettiti con la tua comunità fitness. L\'app completa per il tuo benessere.',
  keywords: 'fitness, palestra, corsi, prenotazioni, allenamento, sport, benessere',
  themeColor: '#00ff00',
  appleTouchIcon: '/apple-touch-icon.png'
});

const getAdminConfig = (): DomainConfig => ({
  title: 'Allenati.me - Backoffice Amministrativo',
  description: 'Pannello di controllo per gestire corsi, istruttori, prenotazioni e analisi della palestra.',
  keywords: 'backoffice, amministrazione, gestione palestra, corsi, analytics',
  themeColor: '#8b5cf6',
  appleTouchIcon: '/admin-apple-touch-icon.png'
});

export const updateDocumentMeta = () => {
  const config = getDomainConfig();
  
  // Update title
  document.title = config.title;
  
  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', config.description);
  }
  
  // Update meta keywords
  const metaKeywords = document.querySelector('meta[name="keywords"]') || document.createElement('meta');
  metaKeywords.setAttribute('name', 'keywords');
  metaKeywords.setAttribute('content', config.keywords);
  if (!document.querySelector('meta[name="keywords"]')) {
    document.head.appendChild(metaKeywords);
  }
  
  // Update theme color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
  metaThemeColor.setAttribute('name', 'theme-color');
  metaThemeColor.setAttribute('content', config.themeColor);
  if (!document.querySelector('meta[name="theme-color"]')) {
    document.head.appendChild(metaThemeColor);
  }
};