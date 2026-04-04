import type { ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

function AppRoutes() {
  return (
    <Routes>
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
