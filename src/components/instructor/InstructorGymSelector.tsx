import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Crown, Building } from 'lucide-react';
import { useInstructorGym } from '@/contexts/InstructorGymContext';

interface InstructorGymSelectorProps {
  className?: string;
}

export const InstructorGymSelector: React.FC<InstructorGymSelectorProps> = ({ className }) => {
  const { instructorGyms, selectedGymId, setSelectedGymId, loading } = useInstructorGym();

  if (loading) {
    return (
      <div className={className}>
        <div className="h-10 bg-muted animate-pulse rounded-md"></div>
      </div>
    );
  }

  if (instructorGyms.length === 0) {
    return (
      <div className={className}>
        <Badge variant="outline" className="text-muted-foreground">
          <Building className="w-4 h-4 mr-2" />
          Nessuna palestra assegnata
        </Badge>
      </div>
    );
  }

  if (instructorGyms.length === 1) {
    const gym = instructorGyms[0];
    return (
      <div className={className}>
        <Badge variant="default" className="gap-2">
          {gym.has_owner_privileges ? (
            <Crown className="w-4 h-4" />
          ) : (
            <Building className="w-4 h-4" />
          )}
          {gym.name}
          {gym.has_owner_privileges && (
            <span className="text-xs opacity-80">(Super)</span>
          )}
        </Badge>
      </div>
    );
  }

  return (
    <div className={className}>
      <Select value={selectedGymId || ''} onValueChange={setSelectedGymId}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleziona palestra">
            {selectedGymId && (
              <div className="flex items-center gap-2">
                {instructorGyms.find(g => g.id === selectedGymId)?.has_owner_privileges ? (
                  <Crown className="w-4 h-4" />
                ) : (
                  <Building className="w-4 h-4" />
                )}
                <span>{instructorGyms.find(g => g.id === selectedGymId)?.name}</span>
                {instructorGyms.find(g => g.id === selectedGymId)?.has_owner_privileges && (
                  <span className="text-xs opacity-80">(Super)</span>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {instructorGyms.map((gym) => (
            <SelectItem key={gym.id} value={gym.id}>
              <div className="flex items-center gap-2">
                {gym.has_owner_privileges ? (
                  <Crown className="w-4 h-4" />
                ) : (
                  <Building className="w-4 h-4" />
                )}
                <span>{gym.name}</span>
                {gym.has_owner_privileges && (
                  <span className="text-xs opacity-80">(Super Istruttore)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};