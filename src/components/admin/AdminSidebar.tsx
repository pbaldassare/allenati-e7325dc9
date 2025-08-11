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
  Building,
  UserCheck,
  ShieldCheck,
  BookOpen,
  CheckSquare,
  Clock,
  ShoppingCart,
  CreditCard,
  Package,
  Wallet,
  TrendingUp,
  FileText,
  Activity,
  MessageSquare,
  Bell,
  Database,
  LogOut
} from 'lucide-react';

const dashboardItems = [
  { title: "Dashboard", url: "/admin", icon: BarChart3 },
];

const courseItems = [
  { title: "Tutti i Corsi", url: "/admin/courses", icon: List },
  { title: "Nuovo Corso", url: "/admin/courses/new", icon: Plus },
];

const userItems = [
  { title: "Lista Utenti", url: "/admin/users", icon: Users },
  { title: "Ruoli e Permessi", url: "/admin/roles", icon: ShieldCheck },
  { title: "Membership", url: "/admin/memberships", icon: UserCheck },
];

const bookingItems = [
  { title: "Tutte le Prenotazioni", url: "/admin/bookings", icon: BookOpen },
  { title: "Check-in", url: "/admin/checkins", icon: CheckSquare },
  { title: "Cronologia", url: "/admin/booking-history", icon: Clock },
];

const financialItems = [
  { title: "Prodotti Shop", url: "/admin/products", icon: Package },
  { title: "Ordini", url: "/admin/orders", icon: ShoppingCart },
  { title: "Crediti Utenti", url: "/admin/credits", icon: Wallet },
  { title: "Abbonamenti", url: "/admin/subscriptions", icon: CreditCard },
];

const structureItems = [
  { title: "Palestre", url: "/admin/gyms", icon: Building },
  { title: "Istruttori", url: "/admin/instructors", icon: Users },
  { title: "Sale", url: "/admin/rooms", icon: MapPin },
  { title: "Calendario", url: "/admin/schedule", icon: CalendarClock },
];

const analyticsItems = [
  { title: "Statistiche Corsi", url: "/admin/analytics/courses", icon: TrendingUp },
  { title: "Report Prenotazioni", url: "/admin/analytics/bookings", icon: FileText },
  { title: "Performance Istruttori", url: "/admin/analytics/instructors", icon: Activity },
];

const systemItems = [
  { title: "Chat Management", url: "/admin/chat", icon: MessageSquare },
  { title: "Notifiche", url: "/admin/notifications", icon: Bell },
  { title: "Impostazioni", url: "/admin/settings", icon: Settings },
  { title: "Log Attività", url: "/admin/logs", icon: Database },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/admin") {
      return currentPath === "/admin";
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
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardItems.map((item) => (
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
          <SidebarGroupLabel>Gestione Corsi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {courseItems.map((item) => (
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
          <SidebarGroupLabel>Gestione Utenti</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userItems.map((item) => (
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
          <SidebarGroupLabel>Gestione Prenotazioni</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {bookingItems.map((item) => (
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
          <SidebarGroupLabel>Gestione Finanziaria</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financialItems.map((item) => (
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
          <SidebarGroupLabel>Amministrazione Strutture</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {structureItems.map((item) => (
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
          <SidebarGroupLabel>Analytics & Report</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
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
          <SidebarGroupLabel>Sistema & Comunicazioni</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
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