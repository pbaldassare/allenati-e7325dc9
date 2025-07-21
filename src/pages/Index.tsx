import { useState } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Dashboard } from "@/components/Dashboard";
import { Leaderboard } from "@/components/Leaderboard";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { Profile } from "@/components/Profile";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");

  const renderActiveTab = () => {
    switch (activeTab) {
      case "home":
        return <Dashboard />;
      case "leaderboard":
        return <Leaderboard />;
      case "calendar":
        return (
          <div className="pb-20 px-4 pt-8">
            <h1 className="text-3xl font-bold text-center mb-8">Calendario Corsi</h1>
            <div className="bg-muted rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Calendario in sviluppo...</p>
            </div>
          </div>
        );
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
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
