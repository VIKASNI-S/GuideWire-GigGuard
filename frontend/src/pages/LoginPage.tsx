import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Shield } from "../components/ui/Icons";

export function LoginPage() {
  const nav = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/auth/login", { email, password, rememberMe: remember });
      await refreshUser();
      toast.success("Welcome back!");
      nav("/dashboard");
    } catch {
      toast.error("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/80 p-8 shadow-2xl">
        <div className="flex items-center gap-2 text-white mb-6">
          <Shield className="h-10 w-10 text-teal-400" />
          <span className="text-xl font-semibold">Phoeraksha</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Sign in</h1>
        <p className="text-slate-400 text-sm mt-1">
          Access your coverage dashboard
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-teal-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-950/60 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-teal-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <span className="text-slate-500 cursor-not-allowed">Forgot password?</span>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{" "}
          <Link to="/signup" className="text-teal-400 font-medium hover:underline">
            Create an account
          </Link>
        </p>
        <Link
          to="/"
          className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-300"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
