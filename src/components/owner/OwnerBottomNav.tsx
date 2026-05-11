import { Gauge, CalendarClock, ClipboardList, Users } from "lucide-react";
import { RoleBottomNav, RoleBottomNavTab } from "@/components/RoleBottomNav";

const tabs: RoleBottomNavTab[] = [
  { id: "dashboard", icon: Gauge, label: "Home", path: "/owner", exact: true },
  { id: "schedule", icon: CalendarClock, label: "Calendario", path: "/owner/schedule" },
  { id: "bookings", icon: ClipboardList, label: "Prenot.", path: "/owner/bookings" },
  { id: "users", icon: Users, label: "Utenti", path: "/owner/users" },
];

export const OwnerBottomNav = () => <RoleBottomNav tabs={tabs} />;

export default OwnerBottomNav;
