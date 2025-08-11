import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubdomainAccess } from '@/hooks/useSubdomainAccess';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, Building2, ArrowRight, Palette, BarChart3, Calendar, MessageSquare } from 'lucide-react';
import { getAdminUrl } from '@/utils/subdomain';

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
  const { userRole } = useSubdomainAccess();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");

  const handleTabChange = (tab: string) => {
    // Handle navigation for external routes
    if (tab === "shop") {
      navigate("/shop");
      return;
    }
    if (tab === "admin") {
      window.location.href = getAdminUrl('/');
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

    // Show role-specific header for gym_owner and instructor
    const renderRoleHeader = () => {
      if (userRole === 'gym_owner') {
        return (
          <div className="bg-card border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Modalità Gestore</h2>
                  <p className="text-xs text-muted-foreground">{user?.gym_name || 'Palestra'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = getAdminUrl('/')}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Backoffice
              </Button>
            </div>
          </div>
        );
      }

      if (userRole === 'instructor') {
        return (
          <div className="bg-card border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-secondary rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Modalità Istruttore</h2>
                  <p className="text-xs text-muted-foreground">Dashboard personale</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/chat')}
                  className="text-xs"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Chat
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('calendar')}
                  className="text-xs"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  Corsi
                </Button>
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <div className="min-h-screen bg-background">
        {renderRoleHeader()}
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
                  onClick={() => {/* Mode selector removed */}}
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
                  onClick={() => window.location.href = getAdminUrl('/')}
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
              onClick={() => {/* Mode selector removed */}}
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

  // Always show user app on main domain
  return renderUserApp();
};