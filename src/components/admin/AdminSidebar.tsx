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
  const { state, toggleSidebar } = useSidebar();
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
      ? "bg-gradient-primary text-white font-medium shadow-primary border border-primary/30" 
      : "hover:bg-primary/10 text-foreground hover:text-primary border border-transparent hover:border-primary/20 transition-all duration-200";
  };

  return (
    <div className="w-64 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-xl">
      {/* Enhanced Header with better visibility */}
      <div className="p-4 border-b border-border bg-gradient-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-primary">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                FitCore Admin
              </h2>
              <Badge variant="default" className="text-xs bg-gradient-primary text-white border-0">
                Pannello Admin
              </Badge>
            </div>
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Enhanced Navigation with better contrast */}
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
            Navigazione Principale
          </h3>
          <div className="space-y-2">
            {adminMenuItems.map((item) => (
              <NavLink 
                key={item.title}
                to={item.url} 
                end={item.url === '/admin'}
                className={`flex items-center space-x-3 p-3 rounded-lg ${getNavCls(item.url)}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
            Azioni Rapide
          </h3>
          <div className="space-y-2">
            {quickActions.map((item) => (
              <NavLink 
                key={item.title}
                to={item.url}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-primary/10 text-foreground hover:text-primary border border-transparent hover:border-primary/20 transition-all duration-200"
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}