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
          {/* Global Sidebar Trigger - Always Visible */}
          <div className="fixed top-4 left-4 z-50">
            <div className="p-2 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg">
              <AdminSidebar />
            </div>
          </div>
          
          {/* Main Content with proper spacing */}
          <main className="flex-1 ml-0 pl-20 bg-background min-h-screen">
            <div className="min-h-screen bg-card/30 backdrop-blur-sm border-l border-border">
              <div className="p-6 space-y-6">
                {/* Admin Header - Always visible to confirm location */}
                <div className="bg-gradient-primary p-4 rounded-lg text-white mb-6 shadow-primary">
                  <h1 className="text-2xl font-bold">🎯 Pannello Admin FitCore</h1>
                  <p className="opacity-90">Sei nella sezione amministrativa</p>
                </div>
                
                {/* Breadcrumb Navigation */}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6 p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium text-primary">Admin</span>
                  <span>→</span>
                  <span>Dashboard</span>
                </div>
                
                {/* Content Area with clear boundaries */}
                <div className="bg-card border border-border rounded-lg min-h-[500px] shadow-card">
                  <Outlet />
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default AdminLayout;