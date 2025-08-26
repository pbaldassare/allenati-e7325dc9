import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  ExternalLink, 
  RefreshCw, 
  Settings,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StripeConnectActionsProps {
  gymId: string;
  accountId?: string | null;
  onboardingComplete?: boolean;
  isAdmin?: boolean;
  onStatusUpdate?: () => void;
  variant?: 'default' | 'compact';
}

export const StripeConnectActions: React.FC<StripeConnectActionsProps> = ({
  gymId,
  accountId,
  onboardingComplete = false,
  isAdmin = false,
  onStatusUpdate,
  variant = 'default'
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateAccount = async () => {
    setLoading('create');
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: { gymId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Successo",
          description: "Account Stripe Connect creato con successo",
        });
        onStatusUpdate?.();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error creating Connect account:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare l'account Connect",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateOnboardingLink = async () => {
    setLoading('onboarding');
    try {
      const { data, error } = await supabase.functions.invoke('get-connect-onboarding-link', {
        body: { gymId }
      });

      if (error) throw error;

      if (data.success) {
        // Open in new tab
        window.open(data.url, '_blank');
        toast({
          title: "Link generato",
          description: "Link di onboarding aperto in una nuova scheda",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating onboarding link:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile generare il link di onboarding",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateLoginLink = async () => {
    setLoading('login');
    try {
      const { data, error } = await supabase.functions.invoke('get-connect-login-link', {
        body: { gymId }
      });

      if (error) throw error;

      if (data.success) {
        // Open in new tab
        window.open(data.url, '_blank');
        toast({
          title: "Dashboard aperta",
          description: "Dashboard Stripe aperta in una nuova scheda",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating login link:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile aprire la dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleVerifyAccount = async () => {
    setLoading('verify');
    try {
      const { data, error } = await supabase.functions.invoke('verify-connect-account', {
        body: { gymId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Stato aggiornato",
          description: "Stato account verificato e aggiornato",
        });
        onStatusUpdate?.();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error verifying account:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile verificare l'account",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {!accountId && isAdmin && (
          <Button
            size="sm"
            onClick={handleCreateAccount}
            disabled={loading === 'create'}
            className="gap-2"
          >
            {loading === 'create' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Crea Account
          </Button>
        )}

        {accountId && !onboardingComplete && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateOnboardingLink}
            disabled={loading === 'onboarding'}
            className="gap-2"
          >
            {loading === 'onboarding' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ExternalLink className="h-3 w-3" />
            )}
            Completa Setup
          </Button>
        )}

        {accountId && onboardingComplete && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateLoginLink}
            disabled={loading === 'login'}
            className="gap-2"
          >
            {loading === 'login' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Settings className="h-3 w-3" />
            )}
            Dashboard
          </Button>
        )}

        {accountId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleVerifyAccount}
            disabled={loading === 'verify'}
          >
            {loading === 'verify' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Create Account (Admin only) */}
      {!accountId && isAdmin && (
        <Button
          onClick={handleCreateAccount}
          disabled={loading === 'create'}
          className="w-full gap-2"
        >
          {loading === 'create' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Crea Account Stripe Connect
        </Button>
      )}

      {/* Onboarding Link */}
      {accountId && !onboardingComplete && (
        <Button
          variant="outline"
          onClick={handleGenerateOnboardingLink}
          disabled={loading === 'onboarding'}
          className="w-full gap-2"
        >
          {loading === 'onboarding' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Completa Configurazione
        </Button>
      )}

      {/* Dashboard Link */}
      {accountId && onboardingComplete && (
        <Button
          variant="outline"
          onClick={handleGenerateLoginLink}
          disabled={loading === 'login'}
          className="w-full gap-2"
        >
          {loading === 'login' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Settings className="h-4 w-4" />
          )}
          Apri Dashboard Stripe
        </Button>
      )}

      {/* Verify Account */}
      {accountId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleVerifyAccount}
          disabled={loading === 'verify'}
          className="w-full gap-2"
        >
          {loading === 'verify' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Verifica Stato Account
        </Button>
      )}
    </div>
  );
};