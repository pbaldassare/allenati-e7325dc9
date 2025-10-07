import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { HowItWorksModal } from "@/components/modals/HowItWorksModal";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
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
  TrendingUp,
  FileText,
} from "lucide-react";

export const OwnerSidebar: React.FC = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
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
    { title: "Analytics", url: "/owner/bookings-analytics", icon: TrendingUp },
    { title: "Stripe Connect", url: "/owner/stripe", icon: CreditCard },
    { title: "Abbonamenti", url: "/owner/subscriptions", icon: ShoppingBag },
    { title: "Piani Abbonamento", url: "/owner/subscription-plans", icon: Settings },
    { title: "Chat", url: "/owner/chat", icon: MessageSquare },
    { title: "Report", url: "/owner/reports", icon: BarChart3 },
    { title: "Documenti", url: "/owner/documents", icon: FileText },
    { title: "Profilo Palestra", url: "/owner/profile", icon: User },
  ];

  const isActive = (path: string) =>
    currentPath === path || (path !== "/owner" && currentPath.startsWith(path));

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Area Proprietario</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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
                    <ShoppingBag className="h-4 w-4" />
                    {!collapsed && <span>Shop</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPath === '/owner/settings'}>
                  <NavLink to="/owner/settings">
                    <User className="h-4 w-4" />
                    {!collapsed && <span>Profilo</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isMobile && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShowHowItWorksModal(true)}>
                    <HelpCircle className="h-4 w-4" />
                    {!collapsed && <span>Come funziona</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>{isLoggingOut ? 'Uscendo...' : 'Esci'}</span>}
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
    </Sidebar>
  );
};

export default OwnerSidebar;
