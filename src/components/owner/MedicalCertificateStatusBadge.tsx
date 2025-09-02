import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileCheck, FileX, AlertTriangle, Clock } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface MedicalCertificateStatusBadgeProps {
  certificate: {
    id: string;
    expiry_date: string;
    status: string;
  } | null;
}

export const MedicalCertificateStatusBadge: React.FC<MedicalCertificateStatusBadgeProps> = ({ 
  certificate 
}) => {
  if (!certificate) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <FileX className="h-3 w-3" />
        Nessun certificato
      </Badge>
    );
  }

  if (certificate.status !== 'approved') {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-warning/20 text-warning-foreground">
        <Clock className="h-3 w-3" />
        In attesa approvazione
      </Badge>
    );
  }

  const now = new Date();
  const expiresAt = parseISO(certificate.expiry_date);
  const daysUntilExpiry = differenceInDays(expiresAt, now);

  if (daysUntilExpiry < 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <FileX className="h-3 w-3" />
        Scaduto
      </Badge>
    );
  }

  if (daysUntilExpiry <= 30) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1 bg-warning/20 text-warning-foreground">
        <AlertTriangle className="h-3 w-3" />
        Scade tra {daysUntilExpiry} giorni
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="flex items-center gap-1 bg-success/20 text-success-foreground">
      <FileCheck className="h-3 w-3" />
      Valido
    </Badge>
  );
};