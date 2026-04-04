import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
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
      </nav>
      <Link
        to="/dashboard"
        className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95"
      >
        Dashboard
      </Link>
    </header>
  );
}
