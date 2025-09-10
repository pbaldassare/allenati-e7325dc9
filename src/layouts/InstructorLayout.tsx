import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { InstructorSidebar } from '@/components/instructor/InstructorSidebar';

import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

export const InstructorLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile();
  const { hasOwnerPrivileges } = useAuth();

  const title = hasOwnerPrivileges ? 'Area Super Istruttore' : 'Area Istruttore';
  const mobileTitle = hasOwnerPrivileges ? 'Super Istruttore' : 'Istruttore';

  useEffect(() => {
    document.title = `${title} | Gym Manager`;
  }, [title]);

  return (
    <ProtectedRoute requiredRoles={['instructor', 'admin']}>
      <SidebarProvider defaultOpen={!isMobile}>
          <div className="min-h-screen flex w-full">
            <Sidebar 
              collapsible={isMobile ? "offcanvas" : "icon"}
              className={isMobile ? "fixed inset-y-0 left-0 z-50" : ""}
            >
              <InstructorSidebar />
            </Sidebar>

          <SidebarInset className="w-full">
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center justify-between px-4 gap-2">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <h1 className="text-lg font-semibold">
                    {isMobile ? mobileTitle : title}
                  </h1>
                </div>
                {!isMobile && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Guida
                  </Button>
                )}
              </div>
            </header>

            <main className={`flex-1 ${isMobile ? 'p-4' : 'p-6'}`}>
              {children || <Outlet />}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default InstructorLayout;