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
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border shadow-lg transition-all duration-200 z-50 md:hidden",
        scrollDirection === "down" && !keyboardVisible ? "translate-y-full" : "translate-y-0",
        keyboardVisible && "hidden"
      )}
    >
      <div className="flex justify-around items-center h-16 px-2">
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
                "flex flex-col items-center justify-center gap-1 h-14 px-3 rounded-none transition-all duration-200",
                isActive 
                  ? "text-primary border-t-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "transition-all duration-200",
                isActive ? "w-6 h-6" : "w-5 h-5"
              )} />
              <span className={cn(
                "text-2xs font-bold uppercase tracking-wide transition-all duration-200",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {tab.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};