import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export const AdminLayout = () => {
  return (
    <ProtectedRoute requireAdmin>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1 flex flex-col">
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center px-4">
                <AdminBreadcrumb />
              </div>
            </div>
            <div className="flex-1 p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};