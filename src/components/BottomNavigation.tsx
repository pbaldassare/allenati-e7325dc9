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
        "fixed bottom-4 left-4 right-4 mx-auto max-w-md glass rounded-3xl shadow-glow transition-all duration-300 z-50 md:hidden",
        scrollDirection === "down" && !keyboardVisible ? "translate-y-[120%]" : "translate-y-0",
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
                "flex flex-col items-center justify-center gap-1 h-14 px-3 rounded-2xl transition-all duration-300",
                isActive 
                  ? "glass-strong text-primary-foreground shadow-primary scale-105" 
                  : "text-muted-foreground hover:text-foreground hover:glass-card"
              )}
            >
              <Icon className={cn(
                "transition-all duration-300",
                isActive ? "w-6 h-6" : "w-5 h-5"
              )} />
              <span className={cn(
                "text-xs font-medium transition-all duration-300",
                isActive ? "opacity-100 font-semibold" : "opacity-70"
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