
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Dashboard } from "@/components/Dashboard";
import { Leaderboard } from "@/components/Leaderboard";
import { UserSubscriptionSelector } from "@/components/UserSubscriptionSelector";
import { Profile } from "@/components/Profile";
import { AIAssistant } from "@/components/AIAssistant";
import { CourseCalendar } from "@/components/CourseCalendar";
import { Chat } from "@/pages/Chat";
import { WelcomeModal } from "@/components/modals/WelcomeModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/hooks/useAuthModal";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { HowItWorksModal } from "@/components/modals/HowItWorksModal";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";


const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const navigate = useNavigate();
  const { showWelcomeModal, setShowWelcomeModal, user, isAuthenticated, loading, isAdmin } = useAuth();
  const { isOpen, defaultMode, openLogin, openRegister, close } = useAuthModal();
  
  // Gestisce i redirect automatici basati sul ruolo
  useAuthRedirect();


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
    if (tab === "owner") {
      navigate("/owner");
      return;
    }
    if (tab === "instructor") {
      navigate("/instructor");
      return;
    }
    if (tab === "gyms") {
      navigate("/gyms");
      return;
    }
    if (tab === "i-miei-corsi") {
      navigate("/i-miei-corsi");
      return;
    }
    
    // Handle internal tabs
    setActiveTab(tab);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "home":
        return <Dashboard />;
      case "leaderboard":
        return <Leaderboard onBack={() => setActiveTab("home")} />;
      case "calendar":
        return <CourseCalendar />;
      case "chat":
        return <Chat />;
      case "ai-assistant":
        return <AIAssistant />;
      case "subscription":
        return <UserSubscriptionSelector />;
      case "profile":
        return <Profile onTabChange={handleTabChange} />;
      default:
        return <Dashboard />;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show auth landing page for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Benvenuto
            </h1>
            <p className="text-muted-foreground text-lg">
              Accedi al tuo account o registrati per iniziare
            </p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={() => setShowHowItWorksModal(true)}
              variant="outline"
              className="w-full text-primary border-primary/20 hover:bg-primary/5"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Come funziona l'app Allenati
            </Button>
            
            <AuthButtons onLogin={openLogin} onRegister={openRegister} />
          </div>
        </div>
        
        <AuthModal 
          isOpen={isOpen}
          onClose={close}
          defaultMode={defaultMode}
        />
        
        <HowItWorksModal
          isOpen={showHowItWorksModal}
          onClose={() => setShowHowItWorksModal(false)}
        />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {renderActiveTab()}
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        
        <WelcomeModal 
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
          userName={user?.first_name}
        />
      </div>
    </ProtectedRoute>
  );
};

export default Index;
