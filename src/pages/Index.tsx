
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Dashboard } from "@/components/Dashboard";
import { Leaderboard } from "@/components/Leaderboard";
import { SubscriptionPlans } from "@/components/SubscriptionPlans";
import { Profile } from "@/components/Profile";
import { CourseCalendar } from "@/components/CourseCalendar";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const navigate = useNavigate();

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
    
    // Handle internal tabs
    setActiveTab(tab);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "home":
        return <Dashboard />;
      case "leaderboard":
        return <Leaderboard />;
      case "calendar":
        return <CourseCalendar />;
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

export default Index;
