import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { initOneSignal } from "@/lib/onesignal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { TourProvider } from "@/components/AppTourContext";
import AppTour from "@/components/AppTour";
import { GymProvider } from "@/contexts/GymContext";
import { InstructorGymProvider } from "@/contexts/InstructorGymContext";
import { OwnerGymProvider } from "@/contexts/OwnerGymContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteFallback from "@/components/RouteFallback";

// Eager: landing/auth routes
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { PaymentVerification } from "./components/PaymentVerification";
import { MobileOptimizations } from "./components/MobileOptimizations";

// Lazy layouts
const AdminLayout = lazy(() => import("./layouts/AdminLayout").then(m => ({ default: m.AdminLayout })));
const OwnerLayout = lazy(() => import("./layouts/OwnerLayout"));
const InstructorLayout = lazy(() => import("./layouts/InstructorLayout"));

// Lazy pages — Admin
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCoursesList = lazy(() => import("./pages/admin/AdminCoursesList"));
const AdminCourseNew = lazy(() => import("./pages/admin/AdminCourseNew"));
const AdminCourseDetail = lazy(() => import("./pages/admin/AdminCourseDetail"));
const AdminCourseEdit = lazy(() => import("./pages/admin/AdminCourseEdit"));
const AdminCourseSchedules = lazy(() => import("./pages/admin/AdminCourseSchedules"));
const AdminCourseSessions = lazy(() => import("./pages/admin/AdminCourseSessions"));
const AdminRooms = lazy(() => import("./pages/admin/AdminRooms"));
const AdminSchedule = lazy(() => import("./pages/admin/AdminSchedule"));
const AdminGyms = lazy(() => import("./pages/admin/AdminGyms"));
const AdminGymApplications = lazy(() => import("./pages/admin/AdminGymApplications").then(m => ({ default: m.AdminGymApplications })));
const AdminGymRequests = lazy(() => import("./pages/admin/AdminGymRequests"));
const AdminGymDetail = lazy(() => import("./pages/admin/AdminGymDetail"));
const AdminGymEdit = lazy(() => import("./pages/admin/AdminGymEdit"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));

// Lazy pages — Owner
const OwnerDashboard = lazy(() => import("./pages/owner/OwnerDashboard"));
const OwnerUsers = lazy(() => import("./pages/owner/OwnerUsers"));
const OwnerInstructors = lazy(() => import("./pages/owner/OwnerInstructors"));
const OwnerRooms = lazy(() => import("./pages/owner/OwnerRooms"));
const OwnerCoursesList = lazy(() => import("./pages/owner/OwnerCoursesList"));
const OwnerCourseNew = lazy(() => import("./pages/owner/OwnerCourseNew"));
const OwnerSubscriptions = lazy(() => import("./pages/owner/OwnerSubscriptions"));
const OwnerSubscriptionPlans = lazy(() => import("./pages/owner/OwnerSubscriptionPlans"));
const OwnerSchedule = lazy(() => import("./pages/owner/OwnerSchedule"));
const OwnerBookings = lazy(() => import("./pages/owner/OwnerBookings"));
const OwnerBookingsAnalytics = lazy(() => import("./pages/owner/OwnerBookingsAnalytics"));
const OwnerReports = lazy(() => import("./pages/owner/OwnerReports"));
const OwnerChat = lazy(() => import("./pages/owner/OwnerChat"));
const OwnerCourseEdit = lazy(() => import("./pages/owner/OwnerCourseEdit"));
const OwnerCourseDetail = lazy(() => import("./pages/owner/OwnerCourseDetail"));
const OwnerCourseSchedules = lazy(() => import("./pages/owner/OwnerCourseSchedules"));
const OwnerCourseSessions = lazy(() => import("./pages/owner/OwnerCourseSessions"));
const OwnerStripeSetup = lazy(() => import("./pages/owner/OwnerStripeSetup"));
const OwnerProfile = lazy(() => import("./pages/owner/OwnerProfile"));
const OwnerDocuments = lazy(() => import("./pages/owner/OwnerDocuments"));

// Lazy pages — Instructor
const InstructorDashboard = lazy(() => import("./pages/instructor/InstructorDashboard"));
const InstructorCourses = lazy(() => import("./pages/instructor/InstructorCourses"));
const InstructorParticipants = lazy(() => import("./pages/instructor/InstructorParticipants"));
const InstructorSchedule = lazy(() => import("./pages/instructor/InstructorSchedule"));

// Lazy pages — Shared user
const Shop = lazy(() => import("./pages/Shop"));
const BookingHistory = lazy(() => import("./pages/BookingHistory"));
const MedicalCertificate = lazy(() => import("./pages/MedicalCertificate"));
const GymDocuments = lazy(() => import("./pages/GymDocuments"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const Gyms = lazy(() => import("./pages/Gyms"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const GymLanding = lazy(() => import("./pages/GymLanding"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => {
  useEffect(() => {
    initOneSignal();
  }, []);

  return (
    <ErrorBoundary scope="root">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <GymProvider>
              <InstructorGymProvider>
                <AppDataProvider>
                  <MobileOptimizations>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />
                      <BrowserRouter>
                        <TourProvider>
                          <AppTour />
                          <ErrorBoundary scope="routes">
                            <Suspense fallback={<RouteFallback />}>
                              <Routes>
                                <Route path="/" element={<Index />} />
                                <Route path="/auth" element={<Auth />} />
                                <Route path="/reset-password" element={<ResetPassword />} />
                                <Route path="/privacy" element={<PrivacyPolicy />} />

                                {/* Admin */}
                                <Route
                                  path="/admin"
                                  element={
                                    <ErrorBoundary scope="admin"><AdminLayout /></ErrorBoundary>
                                  }
                                >
                                  <Route index element={<AdminDashboard />} />
                                  <Route path="courses" element={<AdminCoursesList />} />
                                  <Route path="courses/new" element={<AdminCourseNew />} />
                                  <Route path="courses/:id" element={<AdminCourseDetail />} />
                                  <Route path="courses/:id/edit" element={<AdminCourseEdit />} />
                                  <Route path="courses/:id/schedules" element={<AdminCourseSchedules />} />
                                  <Route path="courses/:id/sessions" element={<AdminCourseSessions />} />
                                  <Route path="users" element={<AdminUsers />} />
                                  <Route path="gyms" element={<AdminGyms />} />
                                  <Route path="gyms/:id" element={<AdminGymDetail />} />
                                  <Route path="gyms/:id/edit" element={<AdminGymEdit />} />
                                  <Route path="gym-applications" element={<AdminGymApplications />} />
                                  <Route path="gym-requests" element={<AdminGymRequests />} />
                                  <Route path="rooms" element={<AdminRooms />} />
                                  <Route path="schedule" element={<AdminSchedule />} />
                                  <Route path="chat" element={<AdminChat />} />
                                  <Route path="settings" element={<UserSettings />} />
                                </Route>

                                {/* Owner */}
                                <Route
                                  path="/owner"
                                  element={
                                    <ErrorBoundary scope="owner">
                                      <OwnerGymProvider><OwnerLayout /></OwnerGymProvider>
                                    </ErrorBoundary>
                                  }
                                >
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
                                  <Route path="schedule" element={<OwnerSchedule />} />
                                  <Route path="bookings" element={<OwnerBookings />} />
                                  <Route path="bookings-analytics" element={<OwnerBookingsAnalytics />} />
                                  <Route path="subscriptions" element={<OwnerSubscriptions />} />
                                  <Route path="subscription-plans" element={<OwnerSubscriptionPlans />} />
                                  <Route path="stripe" element={<OwnerStripeSetup />} />
                                  <Route path="chat" element={<OwnerChat />} />
                                  <Route path="reports" element={<OwnerReports />} />
                                  <Route path="documents" element={<OwnerDocuments />} />
                                  <Route path="profile" element={<OwnerProfile />} />
                                  <Route path="settings" element={<UserSettings />} />
                                </Route>

                                {/* Instructor */}
                                <Route
                                  path="/instructor"
                                  element={
                                    <ErrorBoundary scope="instructor"><InstructorLayout /></ErrorBoundary>
                                  }
                                >
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
                                <Route path="/documenti" element={<GymDocuments />} />
                                <Route path="/landing" element={<GymLanding />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </Suspense>
                          </ErrorBoundary>
                        </TourProvider>
                      </BrowserRouter>
                    </TooltipProvider>
                  </MobileOptimizations>
                </AppDataProvider>
              </InstructorGymProvider>
            </GymProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
