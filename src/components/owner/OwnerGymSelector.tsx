import React, { useEffect } from 'react';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building, Crown, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface OwnerGymSelectorProps {
  className?: string;
}

export const OwnerGymSelector: React.FC<OwnerGymSelectorProps> = ({ className }) => {
  const { ownedGyms, selectedGym, setSelectedGym, loading, refreshOwnerGyms } = useOwnerGym();

  // Debug logging per tracciare i valori del context
  useEffect(() => {
    console.log('🏢 OwnerGymSelector - Context state changed:', {
      loading,
      ownedGymsCount: ownedGyms?.length || 0,
      ownedGyms: ownedGyms?.map(g => ({ id: g.id, name: g.name })) || [],
      selectedGym: selectedGym ? { id: selectedGym.id, name: selectedGym.name } : null,
      timestamp: new Date().toISOString()
    });
  }, [loading, ownedGyms, selectedGym]);

  // Log iniziale al mount del componente
  useEffect(() => {
    console.log('🏢 OwnerGymSelector - Component mounted with initial state:', {
      loading,
      ownedGymsCount: ownedGyms?.length || 0,
      hasRefreshFunction: !!refreshOwnerGyms
    });
  }, []);

  if (loading) {
    return <Skeleton className="h-8 w-32" />;
  }

  if (ownedGyms.length === 0) {
    console.warn('⚠️ OwnerGymSelector - Showing "Nessuna palestra" state:', {
      loading,
      ownedGymsLength: ownedGyms.length,
      ownedGymsArray: ownedGyms,
      selectedGym,
      hasRefreshFunction: !!refreshOwnerGyms
    });
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-2">
          <Building className="w-4 h-4" />
          Nessuna palestra
        </Badge>
        {refreshOwnerGyms && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              refreshOwnerGyms();
            }}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  if (ownedGyms.length === 1) {
    return (
      <Badge variant="secondary" className="gap-2 px-3 py-1">
        <Crown className="w-4 h-4" />
        <span className="font-medium">{ownedGyms[0].name}</span>
        <span className="text-xs opacity-75">(unica)</span>
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
      <SelectTrigger className={`w-auto min-w-40 max-w-56 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors ${className}`}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <div className="flex flex-col text-left">
              <span className="font-medium text-sm truncate max-w-32">
                {selectedGym?.name || 'Seleziona palestra'}
              </span>
              <span className="text-xs text-muted-foreground">
                {ownedGyms.length} palestre disponibili
              </span>
            </div>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1 text-xs text-muted-foreground border-b">
          Le tue palestre ({ownedGyms.length})
        </div>
        {ownedGyms.map((gym) => (
          <SelectItem 
            key={gym.id} 
            value={gym.id}
            className={selectedGym?.id === gym.id ? "bg-primary/10" : ""}
          >
            <div className="flex items-center gap-2 w-full">
              <Crown className="w-4 h-4 text-primary" />
              <div className="flex flex-col flex-1">
                <span className="font-medium">{gym.name}</span>
                <span className="text-xs text-muted-foreground">{gym.city}</span>
              </div>
              {selectedGym?.id === gym.id && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};