import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  CreditCard,
  Banknote,
  ExternalLink
} from 'lucide-react';

interface StripeConnectStatusProps {
  accountId?: string | null;
  onboardingComplete?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  dashboardUrl?: string | null;
  requirements?: {
    eventually_due?: string[];
    currently_due?: string[];
    past_due?: string[];
  };
  showDetails?: boolean;
}

export const StripeConnectStatus: React.FC<StripeConnectStatusProps> = ({
  accountId,
  onboardingComplete = false,
  chargesEnabled = false,
  payoutsEnabled = false,
  dashboardUrl,
  requirements,
  showDetails = true
}) => {
  if (!accountId) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">Nessun account Stripe Connect</div>
              <div className="text-sm text-muted-foreground">
                Account non ancora creato
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getOverallStatus = () => {
    if (!onboardingComplete) {
      return {
        label: 'Onboarding incompleto',
        variant: 'destructive' as const,
        icon: <Clock className="h-3 w-3" />
      };
    }
    
    if (chargesEnabled && payoutsEnabled) {
      return {
        label: 'Attivo',
        variant: 'default' as const,
        icon: <CheckCircle className="h-3 w-3" />
      };
    }
    
    if (requirements?.past_due?.length) {
      return {
        label: 'Richiede attenzione',
        variant: 'destructive' as const,
        icon: <XCircle className="h-3 w-3" />
      };
    }
    
    return {
      label: 'In sospeso',
      variant: 'secondary' as const,
      icon: <AlertTriangle className="h-3 w-3" />
    };
  };

  const status = getOverallStatus();

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-medium">Stripe Connect</div>
                <div className="text-sm text-muted-foreground">
                  ID: {accountId.slice(0, 21)}...
                </div>
              </div>
            </div>
            <Badge variant={status.variant} className="gap-1">
              {status.icon}
              {status.label}
            </Badge>
          </div>

          {showDetails && (
            <>
              {/* Capabilities */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Pagamenti</span>
                  {chargesEnabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Payout</span>
                  {payoutsEnabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>

              {/* Requirements */}
              {requirements && (requirements.currently_due?.length || requirements.past_due?.length) && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Requisiti mancanti:
                  </div>
                  <div className="space-y-1">
                    {requirements.past_due?.map((req, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {req.replace(/_/g, ' ')} (scaduto)
                      </Badge>
                    ))}
                    {requirements.currently_due?.map((req, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {req.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dashboard Link */}
              {dashboardUrl && onboardingComplete && (
                <div className="pt-2 border-t">
                  <a 
                    href={dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Apri Dashboard Stripe
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};