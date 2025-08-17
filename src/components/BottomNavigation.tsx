import { Home, TrendingUp, Calendar, CreditCard, User, ShoppingBag, Settings, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const { isAdmin, isGymOwner, isInstructor } = useAuth();
  
  const tabs = [
    { id: "home", icon: Home, label: "Home" },
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "calendar", icon: Calendar, label: "Corsi" },
    { id: "shop", icon: ShoppingBag, label: "Shop" },
    // Add gym join button for regular users only
    ...(!isAdmin && !isGymOwner ? [{ id: "gyms", icon: Plus, label: "Palestre" }] : []),
    ...(isAdmin
      ? [{ id: "admin", icon: Settings, label: "Admin" }]
      : isGymOwner
      ? [{ id: "owner", icon: Settings, label: "Owner" }]
      : [{ id: "profile", icon: User, label: "Profilo" }]),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border">
      <div className="flex items-center justify-around px-4 py-4 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-2 h-auto p-4 transition-colors rounded-xl min-h-[60px]",
                isActive
                  ? "text-primary bg-primary/10 border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon 
                className={cn(
                  "h-6 w-6 transition-colors",
                  isActive && "text-primary"
                )} 
              />
              <span className={cn(
                "text-sm font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};