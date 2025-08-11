import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
} from '@/components/ui/sidebar';
import {
  BarChart3,
  Calendar,
  GraduationCap,
  Users,
  MapPin,
  CalendarClock,
  Settings,
  Plus,
  List,
  FileText
} from 'lucide-react';
import { getAdminPath } from '@/utils/subdomain';

const getMainItems = () => [
  { title: "Dashboard", url: getAdminPath(""), icon: BarChart3 },
  { title: "Tutti i Corsi", url: getAdminPath("/courses"), icon: List },
  { title: "Nuovo Corso", url: getAdminPath("/courses/new"), icon: Plus },
];

const getManagementItems = () => [
  { title: "Istruttori", url: getAdminPath("/instructors"), icon: Users },
  { title: "Sale", url: getAdminPath("/rooms"), icon: MapPin },
  { title: "Calendario", url: getAdminPath("/schedule"), icon: CalendarClock },
  { title: "Certificati Medici", url: getAdminPath("/medical-certificates"), icon: FileText },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const currentPath = location.pathname;

  const mainItems = getMainItems();
  const managementItems = getManagementItems();

  const isActive = (path: string) => {
    const adminPath = getAdminPath("");
    if (path === adminPath) {
      return currentPath === adminPath;
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    return isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50";
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <div className="p-4">
          <h2 className={`font-bold text-lg bg-gradient-primary bg-clip-text text-transparent ${collapsed ? 'hidden' : 'block'}`}>
            Admin Panel
          </h2>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Gestione Corsi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
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
          <SidebarGroupLabel>Amministrazione</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}