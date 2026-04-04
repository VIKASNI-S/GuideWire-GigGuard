import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { DemoProvider } from "../../context/DemoContext";
import type { PlanRow, PolicyRow } from "../../types";

type DemoRC = { demoMode: boolean };

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [planName, setPlanName] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [serverDemo, setServerDemo] = useState(false);
  const [retraining, setRetraining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pol, st, rc] = await Promise.all([
          api.get<{ policy: PolicyRow | null; plan: PlanRow | null }>(
            "/api/policy/current"
          ),
          api.get<{ triggersThisWeek: number }>("/api/payout/stats"),
          api.get<DemoRC>("/api/demo/real-conditions"),
        ]);
        if (cancelled) return;
        if (pol.data.plan) setPlanName(pol.data.plan.name);
        else setPlanName(null);
        setAlertCount(st.data.triggersThisWeek ?? 0);
        setServerDemo(rc.data.demoMode === true);
      } catch {
        if (!cancelled) setServerDemo(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onRetrain() {
    setRetraining(true);
    try {
      const { data } = await api.post<{
        mean_r2: number;
        std_r2: number;
      }>("/api/ml/retrain");
      toast.success(
        `Model retrained! New R² score: ${data.mean_r2.toFixed(2)} (±${data.std_r2.toFixed(3)})`
      );
    } catch {
      toast.error("Retrain failed — is the ML service running?");
    } finally {
      setRetraining(false);
    }
  }

  const initial = user?.fullName?.[0] ?? "U";

  const iconLink = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-center rounded-md p-2 md:px-3 md:py-2 md:justify-start md:gap-2 text-sm ${
      isActive
        ? "border-l-4 border-teal-400 bg-slate-800/80 text-teal-300"
        : "border-l-4 border-transparent text-slate-400 hover:bg-slate-800/50"
    }`;

  return (
    <DemoProvider>
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-12 shrink-0 flex-col border-r border-slate-800 bg-[#0f172a] md:w-[220px]">
        <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-2 md:px-3">
          <img
            src="/favicon.svg"
            alt="Phoeraksha"
            className="h-8 w-8 rounded object-cover md:h-8"
            style={{ maxHeight: 32 }}
          />
          <span className="hidden font-semibold tracking-tight text-white md:inline">
            Phoeraksha
          </span>
        </div>

        <div className="hidden border-b border-slate-800 p-3 md:block">
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 p-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500/30 text-sm font-bold text-teal-200">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.fullName ?? "Rider"}
              </p>
              <p className="truncate text-xs text-teal-400/90">
                {planName ? `${planName} plan` : "No active plan"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-1 md:p-2">
          <NavLink to="/dashboard" end className={iconLink} title="Risk Radar">

            <span><i className="fa-solid fa-shield-halved"></i></span>

            <span className="hidden md:inline">Risk Radar</span>
          </NavLink>
          <NavLink to="/dashboard/coverage" className={iconLink} title="Coverage">
            <span><i className="fa-regular fa-clipboard"></i></span>
            <span className="hidden md:inline">Coverage</span>
          </NavLink>
          <NavLink to="/dashboard/earnings" className={iconLink} title="Earnings">
            <span><i className="fa-solid fa-sack-dollar"></i></span>
            <span className="hidden md:inline">Earnings</span>
          </NavLink>
          {/* <NavLink to="/dashboard/vov" className={iconLink} title="VOV Upload">
            <span>📤</span>
            <span className="hidden md:inline">VOV Upload</span>
          </NavLink> */}
          <NavLink
            to="/dashboard/alerts"
            className={iconLink}
            title="Alerts"
          >
            <span className="relative inline-flex">
            <i className="fa-regular fa-bell"></i>
              {alertCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white md:static md:ml-1 md:inline-flex">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </span>
            <span className="hidden md:inline">Alerts</span>
          </NavLink>
        </nav>

        <div className="mt-auto border-t border-slate-800 p-2 space-y-1">
          {serverDemo && (
            <>
              <button
                type="button"
                disabled={retraining}
                onClick={onRetrain}
                className="md:hidden flex w-full items-center justify-center rounded-md bg-teal-600/20 px-2 py-2 text-lg text-teal-300 hover:bg-teal-600/30 disabled:opacity-50"
                title="Retrain ML Model"
              >
                {retraining ? "…" : "🧠"}
              </button>
              <button
                type="button"
                disabled={retraining}
                onClick={onRetrain}
                className="hidden w-full rounded-md bg-teal-600/20 px-2 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-600/30 disabled:opacity-50 md:block"
              >
                {retraining ? "Retraining…" : "Retrain ML Model"}
              </button>
            </>
          )}
          <button
            type="button"
            className="hidden w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-slate-400 hover:bg-slate-800/50 md:flex"
            title="Settings"
          >
            ⚙️ Settings
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              nav("/login");
            }}
            className="flex w-full items-center justify-center rounded-md px-2 py-2 text-xs text-slate-300 hover:bg-slate-800 md:justify-start md:gap-2"
            title="Logout"
          >
            <span><i className="fa-solid fa-right-from-bracket"></i></span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
    </DemoProvider>
  );
}
