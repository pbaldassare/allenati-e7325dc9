import { useState, useEffect } from 'react';

type ScrollDirection = 'up' | 'down' | 'stable';

export const useScrollDirection = (threshold: number = 10) => {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('stable');
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;
      
      if (Math.abs(scrollY - lastScrollY) < threshold) {
        return;
      }
      
      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      setLastScrollY(scrollY > 0 ? scrollY : 0);
    };

    window.addEventListener('scroll', updateScrollDirection, { passive: true });
    
    return () => window.removeEventListener('scroll', updateScrollDirection);
  }, [lastScrollY, threshold]);

  return scrollDirection;
};