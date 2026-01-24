import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Auth
import ProtectedRoute from "./components/auth/ProtectedRoute";

// User Pages
import Login from "./pages/Login";
import Home from "./pages/Home";
import ModuleRecipes from "./pages/ModuleRecipes";
import RecipeDetail from "./pages/RecipeDetail";
import Favorites from "./pages/Favorites";
import Store from "./pages/Store";
import ThankYou from "./pages/ThankYou";

// Admin Pages
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminModules from "./pages/admin/AdminModules";
import AdminRecipes from "./pages/admin/AdminRecipes";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminImportUsers from "./pages/admin/AdminImportUsers";
import AdminWebhookTest from "./pages/admin/AdminWebhookTest";
import AdminUserModules from "./pages/admin/AdminUserModules";
import AdminAccessLogs from "./pages/admin/AdminAccessLogs";
import AdminSuggestions from "./pages/admin/AdminSuggestions";
import AdminCampaigns from "./pages/admin/AdminCampaigns";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/store" element={<Store />} />
          <Route path="/obrigado" element={<ThankYou />} />

          {/* Protected User Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/module/:id" element={
            <ProtectedRoute>
              <ModuleRecipes />
            </ProtectedRoute>
          } />
          <Route path="/recipe/:id" element={
            <ProtectedRoute>
              <RecipeDetail />
            </ProtectedRoute>
          } />
          <Route path="/favorites" element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          } />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/modules" element={
            <ProtectedRoute requireAdmin>
              <AdminModules />
            </ProtectedRoute>
          } />
          <Route path="/admin/recipes" element={
            <ProtectedRoute requireAdmin>
              <AdminRecipes />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute requireAdmin>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/import" element={
            <ProtectedRoute requireAdmin>
              <AdminImportUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/webhooks" element={
            <ProtectedRoute requireAdmin>
              <AdminWebhookTest />
            </ProtectedRoute>
          } />
          <Route path="/admin/user-modules" element={
            <ProtectedRoute requireAdmin>
              <AdminUserModules />
            </ProtectedRoute>
          } />
          <Route path="/admin/access-logs" element={
            <ProtectedRoute requireAdmin>
              <AdminAccessLogs />
            </ProtectedRoute>
          } />
          <Route path="/admin/suggestions" element={
            <ProtectedRoute requireAdmin>
              <AdminSuggestions />
            </ProtectedRoute>
          } />
          <Route path="/admin/campaigns" element={
            <ProtectedRoute requireAdmin>
              <AdminCampaigns />
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
