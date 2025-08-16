import { useState, useCallback } from 'react';

export const useAuthModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultMode, setDefaultMode] = useState<'login' | 'register'>('login');

  const openLogin = useCallback(() => {
    setDefaultMode('login');
    setIsOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setDefaultMode('register');
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    defaultMode,
    openLogin,
    openRegister,
    close,
  };
};