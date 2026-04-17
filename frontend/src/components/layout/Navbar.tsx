import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function Navbar() {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <Link to="/" className="flex items-center gap-2 text-white">
        <img
          src="/favicon.svg"
          alt="Phoeraksha"
          className="h-9 w-9 rounded-md object-cover ring-1 ring-white/20"
        />
        <span className="text-xl font-semibold tracking-tight">Phoeraksha</span>
      </Link>
      <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
        <a href="#plans" className="hover:text-white transition-colors">
          Plans
        </a>
        <a href="#features" className="hover:text-white transition-colors">
          Features
        </a>
        <a
          href="/admin/login"
          className="text-slate-400 hover:text-white text-sm border border-slate-600 px-3 py-1 rounded-md hover:border-slate-400 transition-all"
        >
          Admin Portal
        </a>
      </nav>
      {user ? (
        <Link
          to="/dashboard"
          className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95"
        >
          Dashboard
        </Link>
      ) : (
        <Link
          to="/signup"
          className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95"
        >
          Get Started
        </Link>
      )}
      </div>
    </header>
  );
}
