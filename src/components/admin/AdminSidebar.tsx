import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Store,
  Calendar
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

const adminMenuItems = [
  {
    title: 'Overview',
    url: '/admin',
    icon: LayoutDashboard
  },
  {
    title: 'Gestione Corsi',
    url: '/admin/courses',
    icon: GraduationCap
  },
  {
    title: 'Utenti',
    url: '/admin/users',
    icon: Users
  },
  {
    title: 'Messaggi',
    url: '/admin/messages',
    icon: MessageSquare
  },
  {
    title: 'Analytics',
    url: '/admin/analytics',
    icon: BarChart3
  }
];

const quickActions = [
  {
    title: 'Nuovo Corso',
    url: '/admin/courses/new',
    icon: GraduationCap
  },
  {
    title: 'Calendario',
    url: '/admin/calendar',
    icon: Calendar
  },
  {
    title: 'Shop',
    url: '/shop',
    icon: Store
  }
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/admin') {
      return currentPath === '/admin';
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) => {
    const active = isActive(path);
    return active 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                  FitCore
                </h2>
                <Badge variant="secondary" className="text-xs">
                  Admin
                </Badge>
              </div>
            )}
          </div>
          <SidebarTrigger className="mt-2" />
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && "Navigazione Principale"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/admin'}
                      className={getNavCls(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && "Azioni Rapide"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickActions.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
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