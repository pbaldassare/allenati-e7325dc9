import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import Index from "./pages/Index";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import CoursesList from "./pages/admin/CoursesList";
import CourseDetail from "./pages/admin/CourseDetail";
import CourseCreate from "./pages/admin/CourseCreate";
import CourseEdit from "./pages/admin/CourseEdit";
import Shop from "./pages/Shop";
import BookingHistory from "./pages/BookingHistory";
import NotFound from "./pages/NotFound";

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
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="courses" element={<CoursesList />} />
                  <Route path="courses/new" element={<CourseCreate />} />
                  <Route path="courses/:id" element={<CourseDetail />} />
                  <Route path="courses/:id/edit" element={<CourseEdit />} />
                </Route>
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
