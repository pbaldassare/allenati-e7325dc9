import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { OwnerSidebar } from '@/components/owner/OwnerSidebar';
import { HowItWorksModal } from '@/components/modals/HowItWorksModal';
import { Button } from '@/components/ui/button';
import { HelpCircle, LogOut, Home } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

import { OwnerGymSelector } from '@/components/owner/OwnerGymSelector';


export const OwnerLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isMobile = useIsMobile();
  const { hasOwnerPrivileges, isInstructor, logout } = useAuth();
  const navigate = useNavigate();

  // Determina il titolo in base al tipo di utente
  const isSuperInstructor = isInstructor && hasOwnerPrivileges;
  const pageTitle = isSuperInstructor ? 'Area Super Istruttore' : 'Area Proprietario';
  const headerTitle = isSuperInstructor 
    ? (isMobile ? 'Super Istruttore' : 'Area Super Istruttore')
    : (isMobile ? 'Proprietario' : 'Area Proprietario');

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    document.title = `${pageTitle} | Gym Manager`;
  }, [pageTitle]);

  return (
    <ProtectedRoute requiredRoles={['gym_owner', 'admin', 'instructor']}>
      <SidebarProvider defaultOpen={!isMobile}>
          <div className="min-h-screen flex w-full">
            <OwnerSidebar />

            <SidebarInset className="w-full">
              <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 items-center justify-between px-4 gap-2">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <h1 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
                      {headerTitle}
                    </h1>
                    {!isMobile && (
                      <div className="ml-4 flex items-center gap-3">
                        <OwnerGymSelector />
                        <div className="hidden sm:block h-4 w-px bg-border" />
                        <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground">
                          <span>Multi-Gym</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isMobile && (
                      <div className="flex items-center gap-2">
                        <OwnerGymSelector />
                      </div>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => navigate('/')}
                    >
                      <Home className="w-4 h-4" />
                      {!isMobile && "Vista Utente"}
                    </Button>
                    {isMobile && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        {isLoggingOut ? 'Uscendo...' : 'Esci'}
                      </Button>
                    )}
                    {!isMobile && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowHowItWorksModal(true)}
                        className="flex items-center gap-2"
                      >
                        <HelpCircle className="w-4 h-4" />
                        Come funziona l'app
                      </Button>
                    )}
                  </div>
                </div>
              </header>

              <main className={`flex-1 ${isMobile ? 'p-4' : 'p-6'}`}>
                {children || <Outlet />}
              </main>
            </SidebarInset>
          </div>
          
          <HowItWorksModal 
            isOpen={showHowItWorksModal} 
            onClose={() => setShowHowItWorksModal(false)} 
          />
        </SidebarProvider>
    </ProtectedRoute>
  );
};

export default OwnerLayout;
