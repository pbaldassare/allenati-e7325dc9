import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { OwnerSidebar } from '@/components/owner/OwnerSidebar';
import { HowItWorksModal } from '@/components/modals/HowItWorksModal';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export const OwnerLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    document.title = 'Area Proprietario | Gym Manager';
  }, []);

  return (
    <ProtectedRoute requiredRoles={['gym_owner', 'admin']}>
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="min-h-screen flex w-full">
          <Sidebar 
            collapsible={isMobile ? "offcanvas" : "icon"}
            className={isMobile ? "fixed inset-y-0 left-0 z-50 w-64" : ""}
          >
            <OwnerSidebar />
          </Sidebar>

          <SidebarInset className="w-full">
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center justify-between px-4 gap-2">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <h1 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {isMobile ? 'Proprietario' : 'Area Proprietario'}
                  </h1>
                </div>
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
