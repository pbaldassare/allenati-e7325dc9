import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL parameters
    const urlToken = searchParams.get('token');
    
    console.log('🔍 Checking for reset token in URL');
    console.log('🌐 Current URL:', window.location.href);
    console.log('🎫 Token found:', urlToken ? 'Yes' : 'No');
    
    if (urlToken) {
      setToken(urlToken);
    } else {
      console.log('❌ No token found in URL parameters');
      toast.error('Link di reset non valido. Il token è mancante.');
      setTimeout(() => navigate('/auth'), 3000);
    }
    
    setIsLoading(false);
  }, [searchParams, navigate]);

  const handleSuccess = () => {
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center py-4">
              <div className="animate-pulse">Caricamento...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img 
                src="/lovable-uploads/f1aff50e-632e-46e0-b09f-145c702dc0be.png" 
                alt="Allenati.me" 
                className="h-12 w-auto"
              />
            </div>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Link non valido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-destructive mb-4">
                Link di reset password non valido o scaduto
              </p>
              <p className="text-sm text-muted-foreground">
                Verrai reindirizzato alla pagina di login...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="space-y-4">
        <div className="text-center mb-6">
          <img 
            src="/lovable-uploads/f1aff50e-632e-46e0-b09f-145c702dc0be.png" 
            alt="Allenati.me" 
            className="h-12 w-auto mx-auto"
          />
        </div>
        <ResetPasswordForm 
          token={token} 
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}