import React from 'react';
import { useGym } from '@/contexts/GymContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface GymSelectorProps {
  showCredits?: boolean;
  className?: string;
}

export function GymSelector({ showCredits = false, className }: GymSelectorProps) {
  const { selectedGym, userGyms, setSelectedGym, loading } = useGym();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-10 w-48" />
        {showCredits && <Skeleton className="h-6 w-16" />}
      </div>
    );
  }

  if (userGyms.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Users className="h-4 w-4" />
        <span className="text-sm">Nessuna palestra disponibile</span>
      </div>
    );
  }

  // If user has only one gym, show it as a badge instead of selector
  if (userGyms.length === 1) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Building2 className="h-3 w-3" />
          {userGyms[0].name}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select
        value={selectedGym?.id || ''}
        onValueChange={(value) => {
          const gym = userGyms.find(g => g.id === value);
          if (gym) {
            setSelectedGym(gym);
          }
        }}
      >
        <SelectTrigger className="w-auto min-w-48">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <SelectValue placeholder="Seleziona palestra" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {userGyms.map((gym) => (
            <SelectItem key={gym.id} value={gym.id}>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <div>
                  <div className="font-medium">{gym.name}</div>
                  {gym.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-32">
                      {gym.description}
                    </div>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}