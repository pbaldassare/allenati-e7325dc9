import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import Shop from "./pages/Shop";
import BookingHistory from "./pages/BookingHistory";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./layouts/AdminLayout";
import OwnerLayout from "./layouts/OwnerLayout";

// Admin Course Management Pages
import AdminCoursesList from "./pages/admin/AdminCoursesList";
import AdminCourseNew from "./pages/admin/AdminCourseNew";
import AdminCourseDetail from "./pages/admin/AdminCourseDetail";
import AdminCourseEdit from "./pages/admin/AdminCourseEdit";
import AdminInstructors from "./pages/admin/AdminInstructors";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminGyms from "./pages/admin/AdminGyms";
import { AdminGymApplications } from "./pages/admin/AdminGymApplications";

// Admin User Management Pages
import AdminUsers from "./pages/admin/AdminUsers";
import AdminChat from "./pages/admin/AdminChat";

// Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerUsers from "./pages/owner/OwnerUsers";
import OwnerInstructors from "./pages/owner/OwnerInstructors";
import OwnerRooms from "./pages/owner/OwnerRooms";
import OwnerCoursesList from "./pages/owner/OwnerCoursesList";
import OwnerCourseNew from "./pages/owner/OwnerCourseNew";
import OwnerSchedule from "./pages/owner/OwnerSchedule";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerChat from "./pages/owner/OwnerChat";
import MedicalCertificate from "./pages/MedicalCertificate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <AppDataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                
                {/* Admin Routes with persistent sidebar */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  
                  {/* Course Management */}
                  <Route path="courses" element={<AdminCoursesList />} />
                  <Route path="courses/new" element={<AdminCourseNew />} />
                  <Route path="courses/:id" element={<AdminCourseDetail />} />
                  <Route path="courses/:id/edit" element={<AdminCourseEdit />} />
                  
                  {/* User Management */}
                  <Route path="users" element={<AdminUsers />} />
                  
                  {/* Structure Management */}
                  <Route path="gyms" element={<AdminGyms />} />
                  <Route path="gym-applications" element={<AdminGymApplications />} />
                  <Route path="instructors" element={<AdminInstructors />} />
                  <Route path="rooms" element={<AdminRooms />} />
                  <Route path="schedule" element={<AdminSchedule />} />
                  
                  {/* Communication */}
                  <Route path="chat" element={<AdminChat />} />
                </Route>

                {/* Owner Routes */}
                <Route path="/owner" element={<OwnerLayout />}>
                  <Route index element={<OwnerDashboard />} />
                  <Route path="users" element={<OwnerUsers />} />
                  <Route path="instructors" element={<OwnerInstructors />} />
                  <Route path="rooms" element={<OwnerRooms />} />
                  <Route path="courses" element={<OwnerCoursesList />} />
                  <Route path="courses/new" element={<OwnerCourseNew />} />
                  <Route path="schedule" element={<OwnerSchedule />} />
                  <Route path="bookings" element={<OwnerBookings />} />
                  <Route path="chat" element={<OwnerChat />} />
                  <Route path="reports" element={<OwnerReports />} />
                </Route>

                <Route path="/shop" element={<Shop />} />
                <Route path="/bookings" element={<BookingHistory />} />
                <Route path="/certificato-medico" element={<MedicalCertificate />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppDataProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
