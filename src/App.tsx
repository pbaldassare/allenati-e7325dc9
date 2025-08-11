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

// Admin Course Management Pages
import AdminCoursesList from "./pages/admin/AdminCoursesList";
import AdminCourseNew from "./pages/admin/AdminCourseNew";
import AdminCourseDetail from "./pages/admin/AdminCourseDetail";
import AdminCourseEdit from "./pages/admin/AdminCourseEdit";
import AdminInstructors from "./pages/admin/AdminInstructors";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminGyms from "./pages/admin/AdminGyms";
import AdminGymNew from "./pages/admin/AdminGymNew";

// Admin User Management Pages
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminMemberships from "./pages/admin/AdminMemberships";

// Admin Booking Management Pages
import AdminBookings from "./pages/admin/AdminBookings";

// Admin Financial Management Pages
import AdminProducts from "./pages/admin/AdminProducts";

// Admin Analytics Pages
import AdminAnalytics from "./pages/admin/AdminAnalytics";

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
                <Route path="/admin" element={<AdminDashboard />} />
                
                {/* Course Management */}
                <Route path="/admin/courses" element={<AdminCoursesList />} />
                <Route path="/admin/courses/new" element={<AdminCourseNew />} />
                <Route path="/admin/courses/:id" element={<AdminCourseDetail />} />
                <Route path="/admin/courses/:id/edit" element={<AdminCourseEdit />} />
                
                {/* User Management */}
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/roles" element={<AdminRoles />} />
                <Route path="/admin/memberships" element={<AdminMemberships />} />
                
                {/* Booking Management */}
                <Route path="/admin/bookings" element={<AdminBookings />} />
                <Route path="/admin/checkins" element={<AdminBookings />} />
                <Route path="/admin/booking-history" element={<AdminBookings />} />
                
                {/* Financial Management */}
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/orders" element={<AdminProducts />} />
                <Route path="/admin/credits" element={<AdminUsers />} />
                <Route path="/admin/subscriptions" element={<AdminUsers />} />
                
                {/* Structure Management */}
                <Route path="/admin/gyms" element={<AdminGyms />} />
                <Route path="/admin/gyms/new" element={<AdminGymNew />} />
                <Route path="/admin/instructors" element={<AdminInstructors />} />
                <Route path="/admin/rooms" element={<AdminRooms />} />
                <Route path="/admin/schedule" element={<AdminSchedule />} />
                
                {/* Analytics */}
                <Route path="/admin/analytics/courses" element={<AdminAnalytics />} />
                <Route path="/admin/analytics/bookings" element={<AdminAnalytics />} />
                <Route path="/admin/analytics/instructors" element={<AdminAnalytics />} />
                
                {/* System */}
                <Route path="/admin/chat" element={<AdminAnalytics />} />
                <Route path="/admin/notifications" element={<AdminAnalytics />} />
                <Route path="/admin/settings" element={<AdminAnalytics />} />
                <Route path="/admin/logs" element={<AdminAnalytics />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/bookings" element={<BookingHistory />} />
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
