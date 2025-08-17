import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGym } from '@/contexts/GymContext';
import { JoinGymModal } from './JoinGymModal';
import { Dumbbell, MapPin, Plus, CheckCircle } from 'lucide-react';

export function MyGymsSection() {
  const { userGyms, selectedGym, setSelectedGym } = useGym();
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  if (userGyms.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium">Nessuna palestra collegata</h3>
              <p className="text-muted-foreground">
                Cerca e unisciti a una palestra per iniziare
              </p>
            </div>
            <Button onClick={() => setJoinModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Trova Palestre
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Le mie Palestre</h3>
        <Button variant="outline" size="sm" onClick={() => setJoinModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Palestra
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {userGyms.map((gym) => {
          const isSelected = selectedGym?.id === gym.id;
          
          return (
            <Card 
              key={gym.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-card ${
                isSelected ? 'border-primary ring-1 ring-primary' : ''
              }`}
              onClick={() => setSelectedGym(gym)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{gym.name}</CardTitle>
                  {isSelected && (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Attiva
                    </Badge>
                  )}
                </div>
                {gym.description && (
                  <CardDescription className="text-sm">{gym.description}</CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Palestra affiliata</span>
                </div>
                
                {!isSelected && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGym(gym);
                    }}
                  >
                    Seleziona Palestra
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <JoinGymModal 
        open={joinModalOpen} 
        onOpenChange={setJoinModalOpen} 
      />
    </div>
  );
}