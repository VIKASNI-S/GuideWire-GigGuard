import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";

const links = [
  { to: "/admin/dashboard", label: "📊 Overview", end: true },
  { to: "/admin/dashboard/workers", label: "👥 Workers" },
  { to: "/admin/dashboard/map", label: "🗺️ Live Map" },
  { to: "/admin/dashboard/fraud", label: "🚨 Fraud Alerts" },
  { to: "/admin/dashboard/payouts", label: "💰 Payouts" },
  { to: "/admin/dashboard/analytics", label: "📈 Analytics" },
];

export function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-slate-950 text-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <p className="text-xl font-semibold text-white">Phoeraksha</p>
          <p className="text-xs text-teal-300 mt-0.5">Admin Portal</p>
        </div>
        <nav className="p-2 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm border-l-4 ${
                  isActive
                    ? "border-teal-400 bg-slate-800 text-teal-300"
                    : "border-transparent hover:bg-slate-900"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-3 border-t border-slate-800">
          <p className="text-xs text-slate-400">{admin?.name}</p>
          <button
            type="button"
            onClick={() => {
              logout();
              nav("/admin/login");
            }}
            className="mt-2 w-full rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-xs text-slate-500">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
