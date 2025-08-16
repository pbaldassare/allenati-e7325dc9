import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, LogIn } from 'lucide-react';

interface AuthButtonsProps {
  onLogin: () => void;
  onRegister: () => void;
}

export const AuthButtons: React.FC<AuthButtonsProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
      <Button
        onClick={onRegister}
        size="lg"
        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Registrati Gratis
      </Button>
      <Button
        onClick={onLogin}
        variant="outline"
        size="lg"
        className="border-2 hover:bg-primary/5 transition-all duration-300"
      >
        <LogIn className="w-4 h-4 mr-2" />
        Accedi
      </Button>
    </div>
  );
};