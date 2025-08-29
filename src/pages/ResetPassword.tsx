import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { debugPasswordReset } from '@/utils/debugPasswordReset';

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Enhanced debugging with utility
    const allParams = debugPasswordReset.logUrlParams(searchParams);
    const resetMethod = debugPasswordReset.getResetMethod(searchParams);
    
    console.log('🎯 Selected reset method:', resetMethod);

    // Set timeout to ensure fields are unlocked if auth takes too long
    const authTimeout = setTimeout(() => {
      console.log('⏰ Auth timeout - unlocking fields');
      setIsAuthenticating(false);
      setIsAuthenticated(true);
    }, 5000);

    if (resetMethod.method === 'session') {
      const { accessToken, refreshToken, type } = resetMethod.params;
      console.log('🔐 Attempting session-based reset');
      
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        clearTimeout(authTimeout);
        setIsAuthenticating(false);
        
        if (error) {
          console.error('❌ Session error:', error);
          toast({
            title: "Errore di autenticazione",
            description: `Errore sessione: ${error.message}`,
            variant: "destructive"
          });
          navigate('/auth');
        } else {
          console.log('✅ Session set successfully:', data);
          setIsAuthenticated(true);
          toast({
            title: "Autenticazione riuscita",
            description: "Ora puoi impostare la nuova password",
            variant: "default"
          });
        }
      });
      return;
    }

    if (resetMethod.method === 'token_hash') {
      const { tokenHash, type } = resetMethod.params;
      console.log('🔐 Attempting token_hash-based reset');
      
      supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery'
      }).then(({ data, error }) => {
        clearTimeout(authTimeout);
        setIsAuthenticating(false);
        
        if (error) {
          console.error('❌ Token hash verification error:', error);
          toast({
            title: "Errore di verifica",
            description: `Token non valido: ${error.message}`,
            variant: "destructive"
          });
          navigate('/auth');
        } else {
          console.log('✅ Token hash verified successfully:', data);
          setIsAuthenticated(true);
          toast({
            title: "Token verificato",
            description: "Ora puoi impostare la nuova password",
            variant: "default"
          });
        }
      });
      return;
    }

    if (resetMethod.method === 'plain_token') {
      const { token, type } = resetMethod.params;
      const validation = debugPasswordReset.validateTokenFormat(token);
      console.log('🔐 Attempting plain token reset:', validation);
      
      if (!validation.valid) {
        clearTimeout(authTimeout);
        setIsAuthenticating(false);
        console.error('❌ Invalid token format:', validation.reason);
        toast({
          title: "Token non valido",
          description: validation.reason,
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      supabase.auth.verifyOtp({
        token: token,
        type: 'recovery',
        email: '' // We might need to store email in localStorage or get it from URL
      }).then(({ data, error }) => {
        clearTimeout(authTimeout);
        setIsAuthenticating(false);
        
        if (error) {
          console.error('❌ Plain token verification error:', error);
          toast({
            title: "Errore di verifica",
            description: `Token error: ${error.message}`,
            variant: "destructive"
          });
          navigate('/auth');
        } else {
          console.log('✅ Plain token verified successfully:', data);
          setIsAuthenticated(true);
          toast({
            title: "Token verificato",
            description: "Ora puoi impostare la nuova password",
            variant: "default"
          });
        }
      });
      return;
    }

    // No valid method found
    clearTimeout(authTimeout);
    setIsAuthenticating(false);
    console.error('❌ No valid reset method found');
    toast({
      title: "Link non valido",
      description: `Link di reset non valido. Parametri ricevuti: ${Object.keys(allParams).join(', ')}`,
      variant: "destructive"
    });
    setTimeout(() => navigate('/auth'), 3000); // Give user time to read the error
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Errore",
        description: "Le password non coincidono",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        toast({
          title: "Errore",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password aggiornata",
          description: "La tua password è stata aggiornata con successo"
        });
        navigate('/auth');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della password",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-4 mb-2">
            <img 
              src="/lovable-uploads/f1aff50e-632e-46e0-b09f-145c702dc0be.png" 
              alt="Allenati Sport Logo" 
              className="h-24 sm:h-20 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <CardTitle className="text-4xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Nuova Password
          </CardTitle>
          <CardDescription className="text-base sm:text-sm">
            Inserisci la tua nuova password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAuthenticating ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifica del token in corso...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-lg sm:text-base">Nuova Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isAuthenticating}
                    required
                    className="pr-10 h-14 sm:h-12 text-base"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || isAuthenticating}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-lg sm:text-base">Conferma Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading || isAuthenticating}
                    required
                    className="pr-10 h-14 sm:h-12 text-base"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading || isAuthenticating}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isLoading || isAuthenticating || !isAuthenticated}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aggiornamento...
                  </>
                ) : (
                  'Aggiorna Password'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};