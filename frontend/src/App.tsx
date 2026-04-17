import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PlansPage } from "./pages/PlansPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { CoveragePage } from "./pages/dashboard/CoveragePage";
import { EarningsPage } from "./pages/dashboard/EarningsPage";
import { VovPage } from "./pages/dashboard/VovPage";
import { AlertsPage } from "./pages/dashboard/AlertsPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminOverviewPage } from "./pages/admin/AdminOverviewPage";
import { AdminWorkersPage } from "./pages/admin/AdminWorkersPage";
import { AdminMapPage } from "./pages/admin/AdminMapPage";
import { AdminFraudPage } from "./pages/admin/AdminFraudPage";
import { AdminPayoutsPage } from "./pages/admin/AdminPayoutsPage";
import { AdminAnalyticsPage } from "./pages/admin/AdminAnalyticsPage";

function Protected({ children }: { children: ReactElement }) {
  const { user, bootstrapped } = useAuth();
  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminProtected({ children }: { children: ReactElement }) {
  const { admin, bootstrapped } = useAdminAuth();
  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-300">Loading admin session…</p>
      </div>
    );
  }
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <DashboardLayout />
              </Protected>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="coverage" element={<CoveragePage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="vov" element={<VovPage />} />
            <Route path="alerts" element={<AlertsPage />} />
          </Route>
          <Route
            path="/plans"
            element={
              <Protected>
                <PlansPage />
              </Protected>
            }
          />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtected>
                <AdminLayout />
              </AdminProtected>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="workers" element={<AdminWorkersPage />} />
            <Route path="map" element={<AdminMapPage />} />
            <Route path="fraud" element={<AdminFraudPage />} />
            <Route path="payouts" element={<AdminPayoutsPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <Toaster position="top-center" />
          <AppRoutes />
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
