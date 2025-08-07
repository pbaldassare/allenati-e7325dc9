import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultMode = 'login' 
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);

  const handleSwitchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {mode === 'login' ? 'Accedi' : 'Registrati'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={handleSwitchMode} />
          ) : (
            <RegisterForm onSwitchToLogin={handleSwitchMode} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};