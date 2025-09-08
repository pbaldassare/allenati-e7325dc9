import React from 'react';
import { useGym } from '@/contexts/GymContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface GymSelectorWithLogoProps {
  className?: string;
}

export const GymSelectorWithLogo: React.FC<GymSelectorWithLogoProps> = ({ className }) => {
  const { selectedGym, userGyms, setSelectedGym, loading } = useGym();

  if (loading) {
    return <Skeleton className="h-9 w-32" />;
  }

  if (userGyms.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-sm">
        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
          <Building2 className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">Nessuna palestra</span>
      </div>
    );
  }

  if (userGyms.length === 1) {
    return (
      <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-sm">
        {selectedGym?.logo_url ? (
          <Avatar className="h-5 w-5">
            <AvatarImage src={selectedGym.logo_url} alt={selectedGym.name} />
            <AvatarFallback className="text-xs">
              <Building2 className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-3 w-3 text-primary" />
          </div>
        )}
        <span className="text-sm font-medium truncate max-w-[120px]">
          {selectedGym?.name}
        </span>
      </div>
    );
  }

  return (
    <Select
      value={selectedGym?.id || ''}
      onValueChange={(value) => {
        const gym = userGyms.find(g => g.id === value);
        if (gym) {
          setSelectedGym(gym);
        }
      }}
    >
      <SelectTrigger className={`w-auto min-w-32 bg-background/90 backdrop-blur-sm border shadow-sm ${className}`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            {selectedGym?.logo_url ? (
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedGym.logo_url} alt={selectedGym.name} />
                <AvatarFallback className="text-xs">
                  <Building2 className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-3 w-3 text-primary" />
              </div>
            )}
            <span className="truncate max-w-[100px]">{selectedGym?.name}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {userGyms.map((gym) => (
          <SelectItem key={gym.id} value={gym.id}>
            <div className="flex items-center gap-2">
              {gym.logo_url ? (
                <Avatar className="h-5 w-5">
                  <AvatarImage src={gym.logo_url} alt={gym.name} />
                  <AvatarFallback className="text-xs">
                    <Building2 className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-3 w-3 text-primary" />
                </div>
              )}
              <span>{gym.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};