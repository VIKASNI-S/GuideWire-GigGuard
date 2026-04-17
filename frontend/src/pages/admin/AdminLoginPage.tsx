import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAdminAuth } from "../../context/AdminAuthContext";

export function AdminLoginPage() {
  const { login } = useAdminAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@phoeraksha.com");
  const [password, setPassword] = useState("Admin@123");
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form
        className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await login(email, password);
            toast.success("Admin login successful");
            nav("/admin/dashboard");
          } catch {
            toast.error("Invalid admin credentials");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="text-2xl font-bold">Phoeraksha Admin</h1>
        <p className="text-sm text-slate-400 mt-1">Secure operations portal</p>
        <label className="block mt-5 text-sm">Email</label>
        <input className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block mt-3 text-sm">Password</label>
        <input type="password" className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={busy} className="mt-5 w-full rounded-lg bg-teal-600 px-4 py-2.5 font-semibold hover:bg-teal-500 disabled:opacity-50">
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
