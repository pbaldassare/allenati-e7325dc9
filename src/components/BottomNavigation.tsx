import { Home, TrendingUp, Calendar, CreditCard, User, ShoppingBag, Settings, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const { isAdmin } = useAuth();
  
  const tabs = [
    { id: "home", icon: Home, label: "Home" },
    { id: "leaderboard", icon: TrendingUp, label: "Classifica" },
    { id: "calendar", icon: Calendar, label: "Corsi" },
    { id: "chat", icon: MessageCircle, label: "Chat" },
    { id: "shop", icon: ShoppingBag, label: "Shop" },
    ...(isAdmin ? [{ id: "admin", icon: Settings, label: "Admin" }] : [{ id: "profile", icon: User, label: "Profilo" }]),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/50 glass">
      <div className="flex items-center justify-around px-3 py-3 max-w-md mx-auto">
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
                "flex flex-col items-center gap-1.5 h-auto p-3 transition-bounce rounded-2xl",
                isActive
                  ? "text-primary bg-gradient-primary/10 shadow-glow scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon 
                className={cn(
                  "h-6 w-6 transition-bounce",
                  isActive && "text-primary scale-110"
                )} 
              />
              <span className={cn(
                "text-xs font-semibold",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>{tab.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};