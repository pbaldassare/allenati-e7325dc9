import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { HowItWorksModal } from "@/components/modals/HowItWorksModal";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Gauge,
  Users,
  GraduationCap,
  BookOpen,
  PlusCircle,
  CalendarClock,
  ClipboardList,
  BarChart3,
  LogOut,
  Building,
  MessageSquare,
  CreditCard,
  Settings,
  ShoppingBag,
  User,
  HelpCircle,
} from "lucide-react";

export const OwnerSidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isMobile = useIsMobile();
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    try {
      setIsLoggingOut(true);
      await logout();
      toast({ title: 'Logout effettuato' });
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout effettuato', variant: 'default' });
    } finally {
      setIsLoggingOut(false);
    }
  };
  const items = [
    { title: "Dashboard", url: "/owner", icon: Gauge },
    { title: "Utenti", url: "/owner/users", icon: Users },
    { title: "Istruttori", url: "/owner/instructors", icon: GraduationCap },
    { title: "Sale", url: "/owner/rooms", icon: Building },
    { title: "Corsi", url: "/owner/courses", icon: BookOpen },
    { title: "Nuovo Corso", url: "/owner/courses/new", icon: PlusCircle },
    { title: "Calendario", url: "/owner/schedule", icon: CalendarClock },
    { title: "Prenotazioni", url: "/owner/bookings", icon: ClipboardList },
    { title: "Stripe Connect", url: "/owner/stripe", icon: CreditCard },
    { title: "Abbonamenti", url: "/owner/subscriptions", icon: ShoppingBag },
    { title: "Piani Abbonamento", url: "/owner/subscription-plans", icon: Settings },
    { title: "Chat", url: "/owner/chat", icon: MessageSquare },
    { title: "Report", url: "/owner/reports", icon: BarChart3 },
    { title: "Profilo Palestra", url: "/owner/profile", icon: User },
  ];

  const isActive = (path: string) =>
    currentPath === path || (path !== "/owner" && currentPath.startsWith(path));

  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Area Proprietario</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPath === '/shop'}>
                  <NavLink to="/shop">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    <span>Shop</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPath === '/owner/settings'}>
                  <NavLink to="/owner/settings">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profilo</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isMobile && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShowHowItWorksModal(true)}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Come funziona</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? 'Uscendo...' : 'Esci'}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {isMobile && (
        <HowItWorksModal 
          isOpen={showHowItWorksModal} 
          onClose={() => setShowHowItWorksModal(false)} 
        />
      )}
    </>
  );
};

export default OwnerSidebar;
