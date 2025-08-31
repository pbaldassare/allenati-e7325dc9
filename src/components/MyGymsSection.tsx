import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGym } from '@/contexts/GymContext';
import { Dumbbell, MapPin, CheckCircle, ExternalLink, Sparkles, Zap } from 'lucide-react';

export function MyGymsSection() {
  const { userGyms, selectedGym, setSelectedGym } = useGym();

  if (userGyms.length === 0) {
    return (
      <Card className="bg-gradient-subtle border-primary/20 overflow-hidden">
        <CardContent className="p-8 text-center relative">
          <div className="absolute inset-0 bg-gradient-primary opacity-5" />
          <div className="space-y-4 relative z-10">
            <div className="relative">
              <Dumbbell className="w-12 h-12 mx-auto text-primary animate-float" />
              <Sparkles className="w-4 h-4 text-secondary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold bg-gradient-text bg-clip-text text-transparent">
                Nessuna palestra collegata
              </h3>
              <p className="text-muted-foreground mt-2">
                Vai alla sezione "Palestre" per unirti a nuove palestre
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold bg-gradient-text bg-clip-text text-transparent">
          Le mie Palestre
        </h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground group hover:text-primary transition-colors cursor-pointer">
          <ExternalLink className="w-3 h-3 group-hover:rotate-12 transition-transform" />
          <span>Aggiungi altre</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {userGyms.map((gym) => {
          const isSelected = selectedGym?.id === gym.id;
          
          return (
            <Card 
              key={gym.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-glow hover:scale-[1.02] group ${
                isSelected 
                  ? 'border-primary ring-2 ring-primary/30 bg-gradient-primary/5 shadow-primary' 
                  : 'hover:border-primary/40 hover:bg-gradient-subtle'
              }`}
              onClick={() => setSelectedGym(gym)}
            >
              <CardHeader className="pb-3 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold group-hover:text-primary transition-colors flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    {gym.name}
                  </CardTitle>
                  {isSelected && (
                    <Badge className="text-xs bg-gradient-accent text-white animate-pulse">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Attiva
                    </Badge>
                  )}
                </div>
                {gym.description && (
                  <CardDescription className="text-sm">{gym.description}</CardDescription>
                )}
                {isSelected && (
                  <div className="absolute -top-1 -right-1">
                    <Zap className="w-4 h-4 text-secondary animate-pulse" />
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2 text-accent" />
                  <span>Palestra affiliata</span>
                </div>
                
                {!isSelected && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full hover:bg-gradient-primary hover:text-white hover:border-primary transition-all duration-300 group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGym(gym);
                    }}
                  >
                    <Sparkles className="w-3 h-3 mr-2 group-hover:animate-pulse" />
                    Seleziona Palestra
                  </Button>
                )}
                
                {isSelected && (
                  <div className="text-center p-2 bg-gradient-accent/10 rounded-lg">
                    <span className="text-xs font-medium text-primary">
                      🎯 Palestra attiva
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}