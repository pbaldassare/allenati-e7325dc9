import React from "react";
import { NavLink, useLocation } from "react-router-dom";
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
} from "lucide-react";

export const OwnerSidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const items = [
    { title: "Dashboard", url: "/owner", icon: Gauge },
    { title: "Utenti", url: "/owner/users", icon: Users },
    { title: "Istruttori", url: "/owner/instructors", icon: GraduationCap },
    { title: "Corsi", url: "/owner/courses", icon: BookOpen },
    { title: "Nuovo Corso", url: "/owner/courses/new", icon: PlusCircle },
    { title: "Calendario", url: "/owner/schedule", icon: CalendarClock },
    { title: "Prenotazioni", url: "/owner/bookings", icon: ClipboardList },
    { title: "Report", url: "/owner/reports", icon: BarChart3 },
  ];

  const isActive = (path: string) =>
    currentPath === path || (path !== "/owner" && currentPath.startsWith(path));

  return (
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
    </SidebarContent>
  );
};

export default OwnerSidebar;
