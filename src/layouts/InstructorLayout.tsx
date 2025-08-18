import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { InstructorSidebar } from '@/components/instructor/InstructorSidebar';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export const InstructorLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    document.title = 'Area Istruttore | Gym Manager';
  }, []);

  return (
    <ProtectedRoute requiredRoles={['instructor', 'admin']}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <Sidebar collapsible="icon">
            <InstructorSidebar />
          </Sidebar>

          <SidebarInset>
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center justify-between px-4 gap-2">
                <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <h1 className="text-lg font-semibold">Area Istruttore</h1>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Guida
                </Button>
              </div>
            </header>

            <main className="flex-1 p-6">
              {children || <Outlet />}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default InstructorLayout;