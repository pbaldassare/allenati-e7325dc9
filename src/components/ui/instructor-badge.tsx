import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

interface InstructorBadgeProps {
  hasOwnerPrivileges: boolean;
  className?: string;
}

export const InstructorBadge: React.FC<InstructorBadgeProps> = ({ 
  hasOwnerPrivileges, 
  className 
}) => {
  if (!hasOwnerPrivileges) {
    return (
      <Badge variant="secondary" className={className}>
        Istruttore
      </Badge>
    );
  }

  return (
    <Badge variant="default" className={`bg-amber-500 hover:bg-amber-600 ${className}`}>
      <Crown className="w-3 h-3 mr-1" />
      Super Istruttore
    </Badge>
  );
};