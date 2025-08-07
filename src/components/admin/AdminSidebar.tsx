import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  MessageSquare,
  BarChart3,
  Store,
  Calendar
} from 'lucide-react';
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
      ? "bg-gradient-primary text-white font-medium" 
      : "hover:bg-primary/10 text-foreground hover:text-primary transition-colors";
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
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
      </div>

      {/* Navigation */}
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
            Navigazione Principale
          </h3>
          <div className="space-y-1">
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
          <div className="space-y-1">
            {quickActions.map((item) => (
              <NavLink 
                key={item.title}
                to={item.url}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-primary/10 text-foreground hover:text-primary transition-colors"
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