import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Plus, CreditCard } from 'lucide-react';
import { GymJoinDropdown } from '@/components/GymJoinDropdown';
import CreditsSubscriptionCard from '@/components/CreditsSubscriptionCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Gyms() {
  const { user } = useAuth();
  const { userGyms, selectedGym, setSelectedGym, loading } = useGym();
  const [activeTab, setActiveTab] = useState('my-gyms');

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Accedi per visualizzare le tue palestre</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Le Mie Palestre</h1>
          <p className="text-muted-foreground text-sm">
            Gestisci le tue palestre, abbonamenti e cerca nuove palestre
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-gyms" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Le Mie Palestre
            </TabsTrigger>
            <TabsTrigger value="find-gyms" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Trova Palestre
            </TabsTrigger>
          </TabsList>

          {/* My Gyms Tab */}
          <TabsContent value="my-gyms" className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : userGyms.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessuna palestra trovata</h3>
                  <p className="text-muted-foreground mb-4">
                    Non sei ancora iscritto a nessuna palestra.
                  </p>
                  <Button 
                    onClick={() => setActiveTab('find-gyms')}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Cerca Palestre
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Active Gym Card with Credits/Subscription */}
                {selectedGym && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">Palestra Attiva</Badge>
                      <h3 className="font-medium">{selectedGym.name}</h3>
                    </div>
                    <CreditsSubscriptionCard />
                  </div>
                )}

                {/* All Gyms List */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">Tutte le Palestre</h3>
                  <div className="grid gap-3">
                    {userGyms.map((gym) => (
                      <Card 
                        key={gym.id} 
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedGym?.id === gym.id 
                            ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedGym(gym)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {gym.name}
                            </CardTitle>
                            {selectedGym?.id === gym.id && (
                              <Badge variant="default" className="text-xs">Attiva</Badge>
                            )}
                          </div>
                          {gym.description && (
                            <p className="text-sm text-muted-foreground">{gym.description}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          {selectedGym?.id !== gym.id && (
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
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Find Gyms Tab */}
          <TabsContent value="find-gyms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Cerca Nuove Palestre
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Trova e richiedi l'accesso a nuove palestre nella tua zona
                </p>
              </CardHeader>
              <CardContent>
                <GymJoinDropdown 
                  onRequestSent={() => {
                    // Optional: Show success message or refresh data
                  }}
                />
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Come funziona</h4>
                    <p className="text-xs text-muted-foreground">
                      Cerca una palestra dal menu a tendina e invia una richiesta di accesso. 
                      Il proprietario della palestra riceverà la tua richiesta e potrà approvarla.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}