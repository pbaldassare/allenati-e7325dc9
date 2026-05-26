import { Capacitor } from '@capacitor/core';

/**
 * Apre l'URL di checkout in modo affidabile su:
 * - Native (iOS/Android): usa @capacitor/browser (in-app browser)
 * - Web: prova window.open; se bloccato dal popup blocker, fa redirect della pagina
 */
export async function openCheckoutUrl(url: string): Promise<void> {
  if (!url) throw new Error('Missing checkout URL');

  // Native: usa il Browser plugin (in-app)
  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url, presentationStyle: 'popover' });
      return;
    } catch (err) {
      console.error('Capacitor Browser open failed, falling back:', err);
      window.location.href = url;
      return;
    }
  }

  // Web: prova nuova tab; se bloccato (popup blocker dopo await), redirect
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    window.location.href = url;
  }
}
