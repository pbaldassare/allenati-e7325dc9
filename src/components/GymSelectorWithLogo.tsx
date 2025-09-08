import React from 'react';
import { useGym } from '@/contexts/GymContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

interface GymSelectorWithLogoProps {
  className?: string;
}

export const GymSelectorWithLogo: React.FC<GymSelectorWithLogoProps> = ({ className }) => {
  const { selectedGym, userGyms, setSelectedGym, loading } = useGym();
  const isMobile = useIsMobile();

  if (loading) {
    return <Skeleton className={`${isMobile ? 'h-11 w-36' : 'h-9 w-32'}`} />;
  }

  if (userGyms.length === 0) {
    return (
      <div className={`flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-lg shadow-sm ${isMobile ? 'px-4 py-3 min-h-[44px]' : 'px-3 py-2'}`}>
        <div className={`rounded-full bg-muted flex items-center justify-center ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`}>
          <Building2 className={`text-muted-foreground ${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
        </div>
        <span className={`text-muted-foreground ${isMobile ? 'text-base' : 'text-sm'}`}>Nessuna palestra</span>
      </div>
    );
  }

  if (userGyms.length === 1) {
    return (
      <div className={`flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-lg shadow-sm ${isMobile ? 'px-4 py-3 min-h-[44px]' : 'px-3 py-2'}`}>
        {selectedGym?.logo_url ? (
          <Avatar className={isMobile ? 'h-6 w-6' : 'h-5 w-5'}>
            <AvatarImage src={selectedGym.logo_url} alt={selectedGym.name} />
            <AvatarFallback className="text-xs">
              <Building2 className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className={`rounded-full bg-primary/10 flex items-center justify-center ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`}>
            <Building2 className={`text-primary ${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
          </div>
        )}
        <span className={`font-medium truncate ${isMobile ? 'text-base max-w-[140px]' : 'text-sm max-w-[120px]'}`}>
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
      <SelectTrigger className={`w-auto bg-background/90 backdrop-blur-sm border shadow-sm ${isMobile ? 'min-w-36 px-4 py-3 min-h-[44px]' : 'min-w-32 px-3 py-2'} ${className}`}>
        <SelectValue>
          <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-2'}`}>
            {selectedGym?.logo_url ? (
              <Avatar className={isMobile ? 'h-6 w-6' : 'h-5 w-5'}>
                <AvatarImage src={selectedGym.logo_url} alt={selectedGym.name} />
                <AvatarFallback className="text-xs">
                  <Building2 className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className={`rounded-full bg-primary/10 flex items-center justify-center ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`}>
                <Building2 className={`text-primary ${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
              </div>
            )}
            <span className={`truncate ${isMobile ? 'text-base max-w-[120px]' : 'text-sm max-w-[100px]'}`}>{selectedGym?.name}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-lg z-50">
        {userGyms.map((gym) => (
          <SelectItem key={gym.id} value={gym.id} className={isMobile ? 'px-4 py-3' : 'px-3 py-2'}>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-2'}`}>
              {gym.logo_url ? (
                <Avatar className={isMobile ? 'h-6 w-6' : 'h-5 w-5'}>
                  <AvatarImage src={gym.logo_url} alt={gym.name} />
                  <AvatarFallback className="text-xs">
                    <Building2 className={isMobile ? 'h-4 w-4' : 'h-3 w-3'} />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className={`rounded-full bg-primary/10 flex items-center justify-center ${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`}>
                  <Building2 className={`text-primary ${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                </div>
              )}
              <span className={isMobile ? 'text-base' : 'text-sm'}>{gym.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};