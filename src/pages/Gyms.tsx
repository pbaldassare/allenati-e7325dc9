import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Plus, CreditCard, ArrowLeft, Sparkles, Zap, Star } from 'lucide-react';
import { GymJoinDropdown } from '@/components/GymJoinDropdown';
import CreditsSubscriptionCard from '@/components/CreditsSubscriptionCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Gyms() {
  const { user } = useAuth();
  const { userGyms, selectedGym, setSelectedGym, loading } = useGym();
  const [activeTab, setActiveTab] = useState('my-gyms');
  const navigate = useNavigate();

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
        {/* Header with Back Button */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/', { replace: true });
                }
              }}
              className="h-8 w-8 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Le Mie Palestre</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-sm text-center">
            Gestisci le tue palestre, abbonamenti e cerca nuove palestre
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gradient-subtle p-1">
            <TabsTrigger 
              value="my-gyms" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-card transition-all duration-300"
            >
              <Building2 className="h-4 w-4" />
              Le Mie Palestre
            </TabsTrigger>
            <TabsTrigger 
              value="find-gyms" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-accent data-[state=active]:text-white data-[state=active]:shadow-card transition-all duration-300"
            >
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
              <Card className="text-center py-12 bg-gradient-subtle border-primary/20 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-primary opacity-5" />
                <CardContent className="relative z-10">
                  <div className="relative inline-block mb-4">
                    <Building2 className="h-12 w-12 text-primary mx-auto animate-float" />
                    <Sparkles className="h-4 w-4 text-secondary absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold bg-gradient-text bg-clip-text text-transparent mb-2">
                    Nessuna palestra trovata
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Non sei ancora iscritto a nessuna palestra.
                  </p>
                  <Button 
                    onClick={() => setActiveTab('find-gyms')}
                    className="gap-2 bg-gradient-accent hover:bg-gradient-accent/90 text-white shadow-glow transition-all duration-300 hover:scale-105"
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
                    <div className="flex items-center gap-3 p-3 bg-gradient-primary/10 rounded-xl border border-primary/20">
                      <Badge className="text-xs bg-gradient-accent text-white animate-pulse">
                        <Star className="w-3 h-3 mr-1" />
                        Palestra Attiva
                      </Badge>
                      <h3 className="font-bold bg-gradient-text bg-clip-text text-transparent">
                        {selectedGym.name}
                      </h3>
                      <Zap className="w-4 h-4 text-secondary ml-auto animate-pulse" />
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
                        className={`cursor-pointer transition-all duration-300 hover:shadow-glow hover:scale-[1.02] group ${
                          selectedGym?.id === gym.id 
                            ? 'ring-2 ring-primary/30 bg-gradient-primary/5 shadow-primary border-primary' 
                            : 'hover:border-primary/40 hover:bg-gradient-subtle'
                        }`}
                        onClick={() => setSelectedGym(gym)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2 font-bold group-hover:text-primary transition-colors">
                              <Building2 className="h-4 w-4 text-primary" />
                              {gym.name}
                            </CardTitle>
                            {selectedGym?.id === gym.id && (
                              <Badge className="text-xs bg-gradient-accent text-white animate-pulse">
                                <Star className="w-3 h-3 mr-1" />
                                Attiva
                              </Badge>
                            )}
                          </div>
                          {gym.description && (
                            <p className="text-sm text-muted-foreground">{gym.description}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          {selectedGym?.id !== gym.id ? (
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
                          ) : (
                            <div className="text-center p-2 bg-gradient-accent/10 rounded-lg">
                              <span className="text-xs font-medium text-primary">
                                🎯 Palestra attiva
                              </span>
                            </div>
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
            <Card className="bg-gradient-subtle border-accent/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-accent opacity-5" />
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-2 font-bold bg-gradient-text bg-clip-text text-transparent">
                  <Plus className="h-5 w-5 text-accent" />
                  Cerca Nuove Palestre
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Trova e richiedi l'accesso a nuove palestre nella tua zona
                </p>
              </CardHeader>
              <CardContent className="relative z-10">
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