import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, Building2, ArrowRight, Palette } from 'lucide-react';

// User App Components
import { BottomNavigation } from '@/components/BottomNavigation';
import { Dashboard } from '@/components/Dashboard';
import { Leaderboard } from '@/components/Leaderboard';
import { SubscriptionPlans } from '@/components/SubscriptionPlans';
import { Profile } from '@/components/Profile';
import { CourseCalendar } from '@/components/CourseCalendar';
import { Chat } from '@/components/Chat';

export const RoleBasedApp = () => {
  const { user, isGymOwner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [showModeSelector, setShowModeSelector] = useState(isGymOwner || isAdmin);

  const handleTabChange = (tab: string) => {
    // Handle navigation for external routes
    if (tab === "shop") {
      navigate("/shop");
      return;
    }
    if (tab === "admin") {
      navigate("/admin");
      return;
    }
    if (tab === "chat") {
      navigate("/chat");
      return;
    }
    
    // Handle internal tabs
    setActiveTab(tab);
  };

  const renderUserApp = () => {
    const renderActiveTab = () => {
      switch (activeTab) {
        case "home":
          return <Dashboard />;
        case "leaderboard":
          return <Leaderboard />;
        case "calendar":
          return <CourseCalendar />;
        case "chat":
          return <Chat />;
        case "subscription":
          return <SubscriptionPlans />;
        case "profile":
          return <Profile />;
        default:
          return <Dashboard />;
      }
    };

    return (
      <div className="min-h-screen bg-background">
        {renderActiveTab()}
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    );
  };

  const renderModeSelector = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Benvenuto{user?.first_name ? `, ${user.first_name}` : ''}
            </h1>
            <p className="text-xl text-muted-foreground">
              Scegli come vuoi utilizzare l'app oggi
            </p>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {user?.role === 'admin' ? 'Amministratore' : 'Gestore Palestra'}
              </Badge>
              {user?.gym_name && (
                <Badge variant="outline">
                  {user.gym_name}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* User Mode */}
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">App Utente</CardTitle>
                <CardDescription>
                  Prenota corsi, visualizza il calendario e gestisci il tuo profilo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Prenotazione corsi</li>
                  <li>• Calendario personale</li>
                  <li>• Chat con istruttori</li>
                  <li>• Gestione abbonamenti</li>
                </ul>
                <Button 
                  className="w-full" 
                  onClick={() => setShowModeSelector(false)}
                >
                  Entra nell'App
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Admin/Gym Owner Mode */}
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-secondary/20">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">Backoffice</CardTitle>
                <CardDescription>
                  Gestisci corsi, istruttori e amministra la palestra
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Gestione corsi</li>
                  <li>• Amministrazione istruttori</li>
                  <li>• Analytics e reportistica</li>
                  <li>• Configurazione palestra</li>
                </ul>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => navigate('/admin')}
                >
                  Vai al Backoffice
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions for user app */}
          <div className="text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowModeSelector(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Palette className="mr-2 h-4 w-4" />
              Continua come utente
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // For basic users and instructors, go straight to user app
  if (!isGymOwner && !isAdmin) {
    return renderUserApp();
  }

  // For gym owners and admins, show mode selector or user app based on choice
  return showModeSelector ? renderModeSelector() : renderUserApp();
};