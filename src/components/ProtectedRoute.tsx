import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, UserPlus, Loader2, LogOut, Home } from 'lucide-react';

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
  const { isAuthenticated, isAdmin, isGymOwner, isInstructor, loading, user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const location = useLocation();
  const navigate = useNavigate();

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
                  className="h-16 w-auto border-2 border-red-500 bg-blue-100"
                  onError={(e) => {
                    console.error('Logo failed to load:', e);
                    e.currentTarget.style.border = '2px solid red';
                    e.currentTarget.style.backgroundColor = 'yellow';
                  }}
                  onLoad={() => console.log('Logo loaded successfully')}
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
    const requiredLabels: string[] = requireAdmin
      ? ['admin']
      : (requiredRoles ?? []);
    return (
      <>
        <AccessDeniedCard
          email={user?.email}
          currentRole={user?.role}
          requiredLabels={requiredLabels}
          pathname={location.pathname}
          onGoHome={() => {
            const home = isAdmin ? '/admin' : isGymOwner ? '/owner' : isInstructor ? '/instructor' : '/';
            navigate(home, { replace: true });
          }}
          onSwitchAccount={async () => {
            await logout();
            setAuthMode('login');
            setShowAuthModal(true);
          }}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultMode={authMode}
        />
      </>
    );
  }

  return <>{children}</>;
};

interface AccessDeniedCardProps {
  email?: string;
  currentRole?: string;
  requiredLabels: string[];
  pathname: string;
  onGoHome: () => void;
  onSwitchAccount: () => void;
}

const roleLabel: Record<string, string> = {
  admin: 'Amministratore',
  gym_owner: 'Proprietario palestra',
  instructor: 'Istruttore',
  basic_user: 'Utente',
};

const AccessDeniedCard: React.FC<AccessDeniedCardProps> = ({
  email,
  currentRole,
  requiredLabels,
  pathname,
  onGoHome,
  onSwitchAccount,
}) => {
  useEffect(() => {
    console.warn('[ProtectedRoute] Access denied', {
      pathname,
      email,
      currentRole,
      requiredRoles: requiredLabels,
    });
  }, [pathname, email, currentRole, requiredLabels]);

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
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Pagina</span>
              <span className="font-mono text-xs truncate">{pathname}</span>
            </div>
            <div className="flex justify-between gap-2 items-center">
              <span className="text-muted-foreground">Account</span>
              <span className="font-medium truncate">{email || '—'}</span>
            </div>
            <div className="flex justify-between gap-2 items-center">
              <span className="text-muted-foreground">Ruolo attuale</span>
              <Badge variant="secondary">
                {currentRole ? (roleLabel[currentRole] ?? currentRole) : 'Sconosciuto'}
              </Badge>
            </div>
            <div className="flex justify-between gap-2 items-center">
              <span className="text-muted-foreground">Ruolo richiesto</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {requiredLabels.length > 0 ? (
                  requiredLabels.map((r) => (
                    <Badge key={r} variant="default">{roleLabel[r] ?? r}</Badge>
                  ))
                ) : (
                  <Badge variant="outline">—</Badge>
                )}
              </div>
            </div>
          </div>

          <Button onClick={onGoHome} className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Vai alla mia area
          </Button>
          <Button onClick={onSwitchAccount} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Esci e accedi con un altro account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
