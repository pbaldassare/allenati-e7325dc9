import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { cn } from '@/lib/utils';

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
    setShowGymApplication(false);
  };

  const handleShowGymApplication = (show: boolean) => {
    setShowGymApplication(show);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "border-0 bg-card/95 backdrop-blur-sm shadow-lg transition-all duration-300",
          showGymApplication ? 'sm:max-w-2xl' : 'sm:max-w-md'
        )}
      >
        <DialogHeader className="text-center space-y-2 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            {mode === 'login' ? 'Benvenuto!' : showGymApplication ? 'Candidatura Palestra' : 'Unisciti a noi!'}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            {mode === 'login' 
              ? 'Accedi al tuo account per continuare' 
              : showGymApplication 
                ? 'Compila il form per candidare la tua palestra'
                : 'Crea un nuovo account per iniziare'
            }
          </p>
        </DialogHeader>
        
        <div className={cn(
          "animate-fade-in transition-all duration-300",
          showGymApplication ? 'p-4' : 'px-6 pb-6'
        )}>
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