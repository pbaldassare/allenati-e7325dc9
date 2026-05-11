import { Home, BookOpen, Calendar, Users } from "lucide-react";
import { RoleBottomNav, RoleBottomNavTab } from "@/components/RoleBottomNav";

const tabs: RoleBottomNavTab[] = [
  { id: "dashboard", icon: Home, label: "Home", path: "/instructor", exact: true },
  { id: "courses", icon: BookOpen, label: "Corsi", path: "/instructor/courses" },
  { id: "schedule", icon: Calendar, label: "Calendario", path: "/instructor/schedule" },
  { id: "participants", icon: Users, label: "Iscritti", path: "/instructor/participants" },
];

export const InstructorBottomNav = () => <RoleBottomNav tabs={tabs} />;

export default InstructorBottomNav;
