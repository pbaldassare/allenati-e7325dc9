import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { GymProvider } from "@/contexts/GymContext";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import Shop from "./pages/Shop";
import BookingHistory from "./pages/BookingHistory";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "./layouts/AdminLayout";
import OwnerLayout from "./layouts/OwnerLayout";
import InstructorLayout from "./layouts/InstructorLayout";

// Admin Course Management Pages
import AdminCoursesList from "./pages/admin/AdminCoursesList";
import AdminCourseNew from "./pages/admin/AdminCourseNew";
import AdminCourseDetail from "./pages/admin/AdminCourseDetail";
import AdminCourseEdit from "./pages/admin/AdminCourseEdit";
import AdminCourseSchedules from "./pages/admin/AdminCourseSchedules";
import AdminCourseSessions from "./pages/admin/AdminCourseSessions";
import AdminCourseExceptions from "./pages/admin/AdminCourseExceptions";

import AdminRooms from "./pages/admin/AdminRooms";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminGyms from "./pages/admin/AdminGyms";
import { AdminGymApplications } from "./pages/admin/AdminGymApplications";
import AdminGymDetail from "./pages/admin/AdminGymDetail";
import AdminGymEdit from "./pages/admin/AdminGymEdit";

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
import OwnerSubscriptions from "./pages/owner/OwnerSubscriptions";
import OwnerSubscriptionPlans from "./pages/owner/OwnerSubscriptionPlans";
import OwnerSchedule from "./pages/owner/OwnerSchedule";
import OwnerBookings from "./pages/owner/OwnerBookings";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerChat from "./pages/owner/OwnerChat";
import OwnerCourseEdit from "./pages/owner/OwnerCourseEdit";
import OwnerCourseDetail from "./pages/owner/OwnerCourseDetail";
import OwnerCourseSchedules from "./pages/owner/OwnerCourseSchedules";
import OwnerCourseSessions from "./pages/owner/OwnerCourseSessions";
import OwnerCourseExceptions from "./pages/owner/OwnerCourseExceptions";
import OwnerStripeSetup from "./pages/owner/OwnerStripeSetup";
import OwnerProfile from "./pages/owner/OwnerProfile";
import MedicalCertificate from "./pages/MedicalCertificate";
import Subscriptions from "./pages/Subscriptions";
import UserSettings from "./pages/UserSettings";
import Gyms from "./pages/Gyms";
import { ResetPassword } from "./pages/ResetPassword";

// Instructor Pages
import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import InstructorCourses from "./pages/instructor/InstructorCourses";
import InstructorParticipants from "./pages/instructor/InstructorParticipants";
import InstructorSchedule from "./pages/instructor/InstructorSchedule";
import { PaymentVerification } from "./components/PaymentVerification";

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
        <GymProvider>
          <AppDataProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Admin Routes with persistent sidebar */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  
                  {/* Course Management */}
                  <Route path="courses" element={<AdminCoursesList />} />
                  <Route path="courses/new" element={<AdminCourseNew />} />
                  <Route path="courses/:id" element={<AdminCourseDetail />} />
                  <Route path="courses/:id/edit" element={<AdminCourseEdit />} />
                  <Route path="courses/:id/schedules" element={<AdminCourseSchedules />} />
                  <Route path="courses/:id/sessions" element={<AdminCourseSessions />} />
                  <Route path="courses/:id/exceptions" element={<AdminCourseExceptions />} />
                  
                  {/* User Management */}
                  <Route path="users" element={<AdminUsers />} />
                  
                  {/* Structure Management */}
                  <Route path="gyms" element={<AdminGyms />} />
                  <Route path="gyms/:id" element={<AdminGymDetail />} />
                  <Route path="gyms/:id/edit" element={<AdminGymEdit />} />
                  <Route path="gym-applications" element={<AdminGymApplications />} />
                  
                  <Route path="rooms" element={<AdminRooms />} />
                  <Route path="schedule" element={<AdminSchedule />} />
                  
                  {/* Communication */}
                  <Route path="chat" element={<AdminChat />} />
                  
                  {/* Settings */}
                  <Route path="settings" element={<UserSettings />} />
                </Route>

                {/* Owner Routes */}
                <Route path="/owner" element={<OwnerLayout />}>
                  <Route index element={<OwnerDashboard />} />
                  <Route path="users" element={<OwnerUsers />} />
                  <Route path="instructors" element={<OwnerInstructors />} />
                  <Route path="rooms" element={<OwnerRooms />} />
                  <Route path="courses" element={<OwnerCoursesList />} />
                  <Route path="courses/new" element={<OwnerCourseNew />} />
                  <Route path="courses/:id" element={<OwnerCourseDetail />} />
                  <Route path="courses/:id/edit" element={<OwnerCourseEdit />} />
                  <Route path="courses/:id/schedules" element={<OwnerCourseSchedules />} />
                  <Route path="courses/:id/sessions" element={<OwnerCourseSessions />} />
                  <Route path="courses/:id/exceptions" element={<OwnerCourseExceptions />} />
                  <Route path="schedule" element={<OwnerSchedule />} />
                  <Route path="bookings" element={<OwnerBookings />} />
                  <Route path="subscriptions" element={<OwnerSubscriptions />} />
                  <Route path="subscription-plans" element={<OwnerSubscriptionPlans />} />
                  <Route path="stripe" element={<OwnerStripeSetup />} />
                  <Route path="chat" element={<OwnerChat />} />
                  <Route path="reports" element={<OwnerReports />} />
                  <Route path="profile" element={<OwnerProfile />} />
                  <Route path="settings" element={<UserSettings />} />
                </Route>

                {/* Instructor Routes */}
                <Route path="/instructor" element={<InstructorLayout />}>
                  <Route index element={<InstructorDashboard />} />
                  <Route path="courses" element={<InstructorCourses />} />
                  <Route path="participants" element={<InstructorParticipants />} />
                  <Route path="schedule" element={<InstructorSchedule />} />
                  <Route path="settings" element={<UserSettings />} />
                </Route>

                <Route path="/shop" element={<Shop />} />
                <Route path="/i-miei-corsi" element={<BookingHistory />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/payment-verification" element={<PaymentVerification />} />
                <Route path="/gyms" element={<Gyms />} />
                <Route path="/impostazioni" element={<UserSettings />} />
                <Route path="/certificato-medico" element={<MedicalCertificate />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </AppDataProvider>
        </GymProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
