import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const AdminDebugPanel = () => {
  const { user, isAuthenticated, isAdmin, login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async () => {
    await login('admin@fitapp.com', 'admin123');
  };

  return (
    <Card className="fixed top-4 right-4 w-80 z-50 bg-card/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">🔧 Admin Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm space-y-1">
          <p><strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Is Admin:</strong> {isAdmin ? '✅ Yes' : '❌ No'}</p>
          <p><strong>User:</strong> {user?.name || 'None'}</p>
          <p><strong>User ID:</strong> {user?.id || 'None'}</p>
          <p><strong>Email:</strong> {user?.email || 'None'}</p>
        </div>
        
        <div className="space-y-2">
          {!isAuthenticated && (
            <Button 
              onClick={handleAdminLogin}
              variant="default"
              className="w-full bg-gradient-primary" 
              size="sm"
            >
              🚀 Login as Admin
            </Button>
          )}
          
          <Button 
            onClick={() => navigate('/admin')} 
            className="w-full" 
            size="sm"
            disabled={!isAdmin}
          >
            Go to Admin Panel
          </Button>
          
          <Button 
            onClick={() => navigate('/')} 
            variant="outline" 
            className="w-full" 
            size="sm"
          >
            Go to Home
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};