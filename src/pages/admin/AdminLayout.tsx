import React from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

const AdminLayout = () => {
  console.log('AdminLayout rendering...'); // Debug log
  
  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen flex bg-background">
        {/* Fixed Sidebar */}
        <div className="w-64 bg-card border-r border-border">
          <AdminSidebar />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 bg-background">
          {/* Admin Header - Always visible */}
          <div className="bg-gradient-primary p-4 text-white border-b border-border">
            <h1 className="text-2xl font-bold">🎯 Pannello Admin FitCore</h1>
            <p className="opacity-90">Sei nella sezione amministrativa</p>
          </div>
          
          {/* Content Area */}
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;