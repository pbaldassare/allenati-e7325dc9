import React from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

const AdminLayout = () => {
  console.log('AdminLayout rendering...'); // Debug log
  
  return (
    <ProtectedRoute requireAdmin>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="min-h-screen bg-background">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default AdminLayout;