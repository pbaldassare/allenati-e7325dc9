
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8 animate-fade-in bg-card border-2 border-foreground rounded-md p-8 shadow-primary">
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold uppercase tracking-tight">
              BENVENUTO
            </h1>
            <p className="text-xl text-muted-foreground font-bold uppercase tracking-wide">
              Supera i tuoi limiti
            </p>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={openRegister}
              size="lg"
              className="w-full text-base shadow-primary hover:shadow-glow"
            >
              INIZIA ORA
            </Button>
            <Button 
              onClick={openLogin}
              variant="outline"
              size="lg"
              className="w-full text-base"
            >
              ACCEDI
            </Button>
          </div>

          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-bold uppercase tracking-wide flex items-center justify-center gap-2 mx-auto"
          >
            <HelpCircle className="w-4 h-4" />
            Come Funziona
          </button>
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
      <div className="min-h-screen bg-background pb-24 md:pb-4">
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
