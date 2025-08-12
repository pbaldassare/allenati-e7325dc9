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
  const [showGymApplication, setShowGymApplication] = useState(false);

  const handleSwitchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setShowGymApplication(false); // Reset gym application when switching modes
  };

  const handleShowGymApplication = (show: boolean) => {
    setShowGymApplication(show);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`p-0 ${showGymApplication ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <DialogHeader className="sr-only">
          <DialogTitle>
            {mode === 'login' ? 'Accedi' : showGymApplication ? 'Candidatura Palestra' : 'Registrati'}
          </DialogTitle>
        </DialogHeader>
        
        <div className={`${showGymApplication ? 'p-4 sm:p-6' : 'p-6'}`}>
          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={handleSwitchMode} />
          ) : (
            <RegisterForm 
              onSwitchToLogin={handleSwitchMode} 
              onShowGymApplication={handleShowGymApplication}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};