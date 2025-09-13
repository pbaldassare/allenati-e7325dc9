import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileOptimizationsProps {
  children: React.ReactNode;
}

export const MobileOptimizations: React.FC<MobileOptimizationsProps> = ({ children }) => {
  const isMobile = useIsMobile();

  // Detect Safari and add specific optimizations
  React.useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    console.log('Browser detection:', { isSafari, userAgent: navigator.userAgent });
    
    if (isMobile && 'ontouchstart' in window) {
      // Prevent double-tap zoom
      let lastTouchEnd = 0;
      document.addEventListener('touchend', (e) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      }, false);

      // Prevent pinch-to-zoom
      document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
      });

      // Add safe area CSS variables for notched devices and Safari fixes
      const safeAreaCSS = `
        :root {
          --safe-area-inset-top: env(safe-area-inset-top);
          --safe-area-inset-right: env(safe-area-inset-right);
          --safe-area-inset-bottom: env(safe-area-inset-bottom);
          --safe-area-inset-left: env(safe-area-inset-left);
        }
        
        .safe-area-top {
          padding-top: max(1rem, env(safe-area-inset-top));
        }
        
        .safe-area-bottom {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
        
        .safe-area-left {
          padding-left: max(1rem, env(safe-area-inset-left));
        }
        
        .safe-area-right {
          padding-right: max(1rem, env(safe-area-inset-right));
        }
        
        /* Safari-specific fixes */
        @supports (-webkit-backdrop-filter: blur(10px)) {
          .backdrop-blur {
            -webkit-backdrop-filter: blur(10px);
            backdrop-filter: blur(10px);
          }
        }
        
        /* Prevent elastic scrolling on iOS Safari */
        body {
          overscroll-behavior: none;
        }
        
        /* Fix for Safari viewport height issues */
        @supports (-webkit-touch-callout: none) {
          .min-h-screen {
            min-height: -webkit-fill-available;
          }
        }
      `;
      
      const styleSheet = document.createElement('style');
      styleSheet.textContent = safeAreaCSS;
      document.head.appendChild(styleSheet);
    }
  }, [isMobile]);

  return <>{children}</>;
};