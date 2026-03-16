import { useState } from "react";
import { Home, BookOpen, Users, Calendar, BarChart3, ShoppingBag, User, LogOut, Settings, Crown } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useInstructorGym } from "@/contexts/InstructorGymContext";
import { InstructorGymSelector } from "./InstructorGymSelector";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const getItems = (hasOwnerPrivileges: boolean) => {
  const baseItems = [
    { title: "Dashboard", url: "/instructor", icon: Home },
    { title: "I Miei Corsi", url: "/instructor/courses", icon: BookOpen },
    { title: "Partecipanti", url: "/instructor/participants", icon: Users },
    { title: "Calendario", url: "/instructor/schedule", icon: Calendar },
    { title: "Statistiche", url: "/instructor/reports", icon: BarChart3 },
  ];

  if (hasOwnerPrivileges) {
    return [
      ...baseItems,
      { title: "Gestione Corsi", url: "/owner/courses", icon: BookOpen },
      { title: "Utenti", url: "/owner/users", icon: Users },
      { title: "Prenotazioni", url: "/owner/bookings", icon: Calendar },
      { title: "Abbonamenti", url: "/owner/subscriptions", icon: Settings },
      { title: "Reports", url: "/owner/reports", icon: BarChart3 },
    ];
  }

  return baseItems;
};

export function InstructorSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { selectedGymId, hasOwnerPrivilegesForGym } = useInstructorGym();
  const isMobile = useIsMobile();
  const currentPath = location.pathname;
  const hasOwnerPrivileges = selectedGymId ? hasOwnerPrivilegesForGym(selectedGymId) : false;
  const items = getItems(hasOwnerPrivileges);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
      toast.success("Logout effettuato con successo");
    } catch (error) {
      toast.error("Errore durante il logout");
    }
  };

  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarHeader className="p-4">
        {!collapsed && !isMobile && <InstructorGymSelector />}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {hasOwnerPrivileges ? (
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                Area Super Istruttore
              </div>
            ) : (
              "Area Istruttore"
            )}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const tourId = item.url === "/instructor" ? "instructor-dashboard-title" :
                  item.url === "/instructor/courses" ? "instructor-nav-courses" :
                  item.url === "/instructor/participants" ? "instructor-nav-participants" :
                  item.url === "/instructor/schedule" ? "instructor-nav-schedule" :
                  undefined;
                return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-tour={tourId}>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Impostazioni</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/shop" className={getNavCls}>
                    <ShoppingBag className="h-4 w-4" />
                    {!collapsed && <span>Shop</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/instructor/settings" className={getNavCls}>
                    <User className="h-4 w-4" />
                    {!collapsed && <span>Profilo</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}