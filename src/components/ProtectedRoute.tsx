import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredRoles?: Array<'admin' | 'gym_owner' | 'instructor' | 'basic_user'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requiredRoles
}) => {
  const { isAuthenticated, isAdmin, isGymOwner, isInstructor, loading, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex flex-col items-center space-y-4 mb-2">
                <img 
                  src="/lovable-uploads/f1aff50e-632e-46e0-b09f-145c702dc0be.png" 
                  alt="Allenati Sport Logo" 
                  className="h-16 w-auto"
                />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Accesso Richiesto
              </CardTitle>
              <CardDescription>
                Devi effettuare l'accesso per visualizzare questa pagina
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Accedi
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => {
                  setAuthMode('register');
                  setShowAuthModal(true);
                }}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Registrati
              </Button>
            </CardContent>
          </Card>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode={authMode}
        />
      </>
    );
  }

  // Role-based protection
  const hasRequiredRole = () => {
    if (requireAdmin) return isAdmin;
    if (requiredRoles && requiredRoles.length > 0) {
      const roleMatches = (
        (isAdmin && requiredRoles.includes('admin')) ||
        (isGymOwner && requiredRoles.includes('gym_owner')) ||
        (isInstructor && requiredRoles.includes('instructor')) ||
        (isAuthenticated && requiredRoles.includes('basic_user'))
      );
      return roleMatches;
    }
    return true;
  };

  if (!hasRequiredRole()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-destructive">
              Accesso Negato
            </CardTitle>
            <CardDescription>
              Non hai i permessi necessari per accedere a questa sezione
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};