import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export const OwnerLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    document.title = 'Area Proprietario | Gym Manager';
  }, []);

  return (
    <ProtectedRoute requiredRoles={['gym_owner', 'admin']}>
      <div className="min-h-screen flex w-full bg-background">
        <main className="flex-1 flex flex-col">
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <h1 className="text-lg font-semibold">Area Proprietario</h1>
            </div>
          </div>
          <div className="flex-1 p-6">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default OwnerLayout;
