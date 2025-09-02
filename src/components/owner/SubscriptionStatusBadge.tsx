import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface SubscriptionStatusBadgeProps {
  subscription: {
    id: string;
    expires_at: string;
    status: string;
    subscription_plans: {
      name: string;
      unlimited_access: boolean;
    };
  } | null;
}

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({ 
  subscription 
}) => {
  if (!subscription) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Nessun abbonamento
      </Badge>
    );
  }

  const now = new Date();
  const expiresAt = parseISO(subscription.expires_at);
  const daysUntilExpiry = differenceInDays(expiresAt, now);

  if (subscription.status !== 'active' || daysUntilExpiry < 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Scaduto
      </Badge>
    );
  }

  if (daysUntilExpiry <= 7) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-warning/20 text-warning-foreground">
        <AlertTriangle className="h-3 w-3" />
        Scade tra {daysUntilExpiry} giorni
      </Badge>
    );
  }

  if (daysUntilExpiry <= 30) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-primary/20 text-primary-foreground">
        <Clock className="h-3 w-3" />
        Scade tra {daysUntilExpiry} giorni
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="flex items-center gap-1 bg-success/20 text-success-foreground">
      <CheckCircle className="h-3 w-3" />
      {subscription.subscription_plans.unlimited_access ? 'Illimitato' : subscription.subscription_plans.name}
    </Badge>
  );
};