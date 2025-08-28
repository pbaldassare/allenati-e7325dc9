import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (!result.error) {
        toast({
          title: "Accesso effettuato",
          description: "Benvenuto!"
        });
      } else {
        toast({
          title: "Errore di accesso",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'accesso",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
         <div className="flex flex-col items-center space-y-4 mb-2">
            <img 
              src="/lovable-uploads/f1aff50e-632e-46e0-b09f-145c702dc0be.png" 
              alt="Allenati Sport Logo" 
              className="h-24 sm:h-20 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
         </div>
        <CardTitle className="text-4xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Accedi
        </CardTitle>
        <CardDescription className="text-base sm:text-sm">
          Inserisci le tue credenziali per accedere
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-lg sm:text-base">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="mario@esempio.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
              required
              className="h-14 sm:h-12 text-base"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-lg sm:text-base">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                required
                className="pr-10 h-14 sm:h-12 text-base"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accesso in corso...
              </>
            ) : (
              'Accedi'
            )}
          </Button>

          <div className="text-center pt-4 space-y-2">
            <Button
              variant="link"
              className="p-0 h-auto text-primary text-base sm:text-sm"
              onClick={() => setShowForgotPassword(true)}
              disabled={isLoading}
            >
              Password dimenticata?
            </Button>
            
            <p className="text-lg sm:text-base text-foreground sm:text-muted-foreground">
              Non hai un account?{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-medium text-primary text-lg sm:text-base"
                onClick={onSwitchToRegister}
                disabled={isLoading}
              >
                Registrati
              </Button>
            </p>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="text-base sm:text-sm text-foreground sm:text-muted-foreground space-y-1">
            <p><strong>Primo accesso?</strong></p>
            <p>Crea un account per iniziare ad utilizzare l'app</p>
          </div>
        </div>
      </CardContent>
      
      <ForgotPasswordDialog 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </Card>
  );
};