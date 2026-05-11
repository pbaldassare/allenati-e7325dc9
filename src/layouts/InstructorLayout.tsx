import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { InstructorSidebar } from '@/components/instructor/InstructorSidebar';
import { InstructorGymSelector } from '@/components/instructor/InstructorGymSelector';
import { InstructorBottomNav } from '@/components/instructor/InstructorBottomNav';
import { Button } from '@/components/ui/button';
import { LogOut, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

export const InstructorLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile();
  const { hasOwnerPrivileges, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const title = hasOwnerPrivileges ? 'Area Super Istruttore' : 'Area Istruttore';
  const mobileTitle = hasOwnerPrivileges ? 'Super Istruttore' : 'Istruttore';

  useEffect(() => {
    document.title = `${title} | Gym Manager`;
  }, [title]);

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

  return (
    <ProtectedRoute requiredRoles={['instructor', 'admin']}>
      <SidebarProvider defaultOpen={!isMobile}>
          <div className="min-h-screen flex w-full">
            <InstructorSidebar />

          <SidebarInset className="w-full">
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center justify-between px-4 gap-2">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <h1 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {isMobile ? mobileTitle : title}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  {isMobile && (
                    <div className="flex items-center gap-2">
                      <InstructorGymSelector />
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
                </div>
              </div>
            </header>

            <main className={`flex-1 overflow-y-auto ${isMobile ? 'p-4 pb-bottom-nav' : 'p-6'}`}>
              {children || <Outlet />}
            </main>
          </SidebarInset>
          <InstructorBottomNav />
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default InstructorLayout;