import { useState, useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export const useVirtualKeyboard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;

    const initialHeight = window.innerHeight;
    setViewportHeight(initialHeight);

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialHeight - currentHeight;
      
      // Threshold for keyboard detection (usually 150px+)
      setIsVisible(heightDifference > 150);
      setViewportHeight(currentHeight);
    };

    // Also listen for visual viewport API if available
    if ('visualViewport' in window && window.visualViewport) {
      const visualViewport = window.visualViewport;
      
      const handleViewportChange = () => {
        const heightDifference = initialHeight - visualViewport.height;
        setIsVisible(heightDifference > 150);
        setViewportHeight(visualViewport.height);
      };

      visualViewport.addEventListener('resize', handleViewportChange);
      
      return () => {
        visualViewport.removeEventListener('resize', handleViewportChange);
      };
    } else {
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isMobile]);

  return { isVisible, viewportHeight };
};