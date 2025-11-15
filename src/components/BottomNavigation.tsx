import { Home, TrendingUp, Calendar, CreditCard, User, ShoppingBag, Settings, MessageSquare, Plus, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useVirtualKeyboard } from "@/hooks/useVirtualKeyboard";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const { isAdmin, isGymOwner, isInstructor, hasOwnerPrivileges } = useAuth();
  const scrollDirection = useScrollDirection();
  const { isVisible: keyboardVisible } = useVirtualKeyboard();
  
  const tabs = isAdmin
    ? [{ id: "admin", icon: Settings, label: "Admin" }]
    : hasOwnerPrivileges
    ? [
        { id: "home", icon: Home, label: "Home" },
        { id: "chat", icon: MessageSquare, label: "Chat" },
        { id: "gyms", icon: Plus, label: "Palestre" },
        { id: "ai-assistant", icon: Brain, label: "IA" },
        { id: "owner", icon: Settings, label: "Owner" }
      ]
    : isInstructor
    ? [
        { id: "home", icon: Home, label: "Home" },
        { id: "chat", icon: MessageSquare, label: "Chat" },
        { id: "gyms", icon: Plus, label: "Palestre" },
        { id: "ai-assistant", icon: Brain, label: "IA" },
        { id: "instructor", icon: Settings, label: "Istruttore" }
      ]
    : [
        { id: "home", icon: Home, label: "Home" },
        { id: "chat", icon: MessageSquare, label: "Chat" },
        { id: "i-miei-corsi", icon: Calendar, label: "I Miei Corsi" },
        { id: "gyms", icon: Plus, label: "Palestre" },
        { id: "ai-assistant", icon: Brain, label: "IA" },
        { id: "profile", icon: User, label: "Profilo" }
      ];

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-primary/10 shadow-card transition-transform duration-300 safe-area-bottom",
      scrollDirection === 'down' && !keyboardVisible && "translate-y-full",
      keyboardVisible && "translate-y-full"
    )}>
      <div className="flex items-center justify-around px-6 py-3 max-w-md mx-auto">
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
                "flex flex-col items-center gap-1 h-auto p-3 transition-all duration-300 rounded-2xl min-h-[60px] relative",
                isActive
                  ? "text-white bg-gradient-primary shadow-primary border-none transform scale-105"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10 hover:scale-105"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 transition-all duration-200",
                  isActive && "text-white scale-110"
                )} 
              />
              <span className={cn(
                "text-xs font-medium transition-colors",
                isActive ? "text-white" : "text-muted-foreground"
              )}>{tab.label}</span>
              {isActive && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};