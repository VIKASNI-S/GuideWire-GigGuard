import { Link } from "react-router-dom";
import { Navbar } from "../components/layout/Navbar";
import { Shield } from "../components/ui/Icons";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Navbar />

      <section className="max-w-6xl mx-auto px-6 pt-10 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-slate-900/60 px-4 py-1.5 text-xs font-medium text-teal-300">
            Real-Time Insurance for Gig Workers
          </span>
          <h1 className="mt-6 text-4xl md:text-5xl font-bold leading-tight text-white">
            Protect Your Daily Income,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-400">
              Instantly.
            </span>
          </h1>
          <p className="mt-5 text-lg text-slate-300 max-w-xl">
            Automated parametric cover for rain, heat, pollution, and traffic —
            payouts credit without filing a claim.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg hover:opacity-95"
            >
              Get Started →
            </Link>
            <a
              href="#plans"
              className="inline-flex items-center rounded-xl border border-slate-600 px-6 py-3 font-semibold text-slate-200 hover:bg-slate-800/60"
            >
              View Plans
            </a>
          </div>
        </div>
        
      </section>

      <section id="features" className="bg-slate-50 py-20 text-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Built for riders on the move
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Instant Payouts",
                desc: "Money hits your UPI when triggers fire — no paperwork.",
                color: "bg-emerald-100 text-emerald-700",
              },
              {
                title: "Weather-Based Protection",
                desc: "Rain, heat, and AQI monitored every few minutes.",
                color: "bg-sky-100 text-sky-700",
              },
              {
                title: "AI Risk Engine",
                desc: "Personalized premiums from real environmental signals.",
                color: "bg-violet-100 text-violet-700",
              },
              {
                title: "Fraud Protection",
                desc: "Multi-signal checks keep the pool fair for everyone.",
                color: "bg-amber-100 text-amber-700",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-white p-6 shadow-sm border border-slate-100"
              >
                <div
                  className={`inline-flex rounded-lg px-3 py-2 text-sm font-medium ${f.color}`}
                >
                  {f.title}
                </div>
                <p className="mt-4 text-slate-600 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">
            Simple weekly plans
          </h2>
          <p className="text-center text-slate-600 mb-12">
            Choose sensitivity vs. premium — upgrade anytime.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Basic", price: "₹20", tag: "Starter" },
              { name: "Standard", price: "₹35", tag: "Most Popular", highlight: true },
              { name: "Premium", price: "₹50", tag: "Max cover" },
            ].map((p) => (
              <div
                key={p.name}
                className={`rounded-xl border p-6 flex flex-col ${
                  p.highlight
                    ? "border-teal-400 shadow-lg ring-2 ring-teal-400/30 scale-[1.02]"
                    : "border-slate-200 shadow-sm"
                }`}
              >
                <span className="text-xs font-semibold uppercase text-teal-600">
                  {p.tag}
                </span>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{p.name}</h3>
                <p className="mt-4 text-3xl font-bold text-slate-900">{p.price}</p>
                <p className="text-sm text-slate-500">per week</p>
                <Link
                  to="/plans"
                  className="mt-6 inline-flex justify-center rounded-lg bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800"
                >
                  Select Plan
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <Shield className="h-8 w-8 text-teal-400" />
            <span className="font-semibold">Phoeraksha</span>
          </div>
          <p className="text-sm text-center md:text-right">
            Income protection for India&apos;s gig delivery workforce. ©{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
