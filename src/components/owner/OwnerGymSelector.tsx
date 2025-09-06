import React from 'react';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OwnerGymSelectorProps {
  className?: string;
}

export const OwnerGymSelector: React.FC<OwnerGymSelectorProps> = ({ className }) => {
  const { ownedGyms, selectedGym, setSelectedGym, loading } = useOwnerGym();

  if (loading) {
    return <Skeleton className="h-8 w-32" />;
  }

  if (ownedGyms.length === 0) {
    return (
      <Badge variant="outline" className="gap-2">
        <Building className="w-4 h-4" />
        Nessuna palestra
      </Badge>
    );
  }

  if (ownedGyms.length === 1) {
    return (
      <Badge variant="secondary" className="gap-2">
        <Crown className="w-4 h-4" />
        {ownedGyms[0].name}
      </Badge>
    );
  }

  return (
    <Select
      value={selectedGym?.id || ''}
      onValueChange={(value) => {
        const gym = ownedGyms.find(g => g.id === value);
        if (gym) {
          setSelectedGym(gym);
        }
      }}
    >
      <SelectTrigger className={`w-auto min-w-32 ${className}`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            <span className="truncate max-w-24">{selectedGym?.name}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ownedGyms.map((gym) => (
          <SelectItem key={gym.id} value={gym.id}>
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              {gym.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};