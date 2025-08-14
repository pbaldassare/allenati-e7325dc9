
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Dashboard } from "@/components/Dashboard";
import { Leaderboard } from "@/components/Leaderboard";
import { UserSubscriptionSelector } from "@/components/UserSubscriptionSelector";
import { Profile } from "@/components/Profile";
import { CourseCalendar } from "@/components/CourseCalendar";
import { Chat } from "@/pages/Chat";

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
    if (tab === "owner") {
      navigate("/owner");
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
      case "chat":
        return <Chat />;
      case "subscription":
        return <UserSubscriptionSelector />;
      case "profile":
        return <Profile onTabChange={handleTabChange} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {renderActiveTab()}
        <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </ProtectedRoute>
  );
};

export default Index;
