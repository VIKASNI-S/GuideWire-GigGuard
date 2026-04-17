import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Navbar } from "../components/layout/Navbar";
import { CountUp } from "../components/ui/CountUp";

export function LandingPage() {
  const [typed, setTyped] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.3 });

  useEffect(() => {
    const text = "Protect Your Daily Income,";
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, []);

  const faqs = useMemo(
    () => [
      ["What exactly does Phoeraksha cover?", "Income lost due to heavy rain, extreme heat, poor AQI, traffic jams, and high winds."],
      ["How are payouts triggered?", "Automatically every 10 minutes using OpenWeatherMap + TomTom data."],
      ["How much does it cost?", "₹30/week (Basic), ₹70/week (Standard), ₹120/week (Premium)."],
      ["Can I upgrade my plan?", "Yes. New plan applies from the next billing week."],
    ],
    []
  );

  return (
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">
      <Navbar />
      <section className="relative overflow-hidden min-h-screen max-w-6xl mx-auto px-6 pt-20 pb-14 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <motion.span initial={{ x: -25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="inline-flex rounded-full border border-teal-400/40 px-4 py-1.5 text-xs text-teal-200">
            🛡️ Real-Time Insurance for Gig Workers
          </motion.span>
          <h1 className="mt-6 text-5xl font-bold leading-tight">{typed}</h1>
          <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: typed.length > 0 ? 1 : 0 }} className="text-5xl font-extrabold text-teal-300 drop-shadow-[0_0_12px_rgba(45,212,191,0.6)]">
            Instantly.
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-4 text-slate-300 max-w-xl">
            Zero-claim parametric insurance for India’s delivery partners — paid out when disruption hits.
          </motion.p>
          <div className="mt-8 flex gap-3">
            <Link to="/signup" className="rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-3 font-semibold hover:scale-105 transition">Get Started →</Link>
            <a href="#plans" className="rounded-lg border border-teal-300/50 px-6 py-3 font-semibold hover:bg-teal-500/20 transition">View Plans</a>
          </div>
        </div>
        <div className="relative h-[420px] flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <svg width="300" height="300" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.3">
                <animate attributeName="r" values="85;95;85" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" />
              </circle>
              <path
                d="M100 20 L160 50 L160 110 Q160 155 100 180 Q40 155 40 110 L40 50 Z"
                fill="url(#shieldGrad)"
                stroke="#0ea5e9"
                strokeWidth="2"
              />
              <defs>
                <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <text x="100" y="115" textAnchor="middle" fontSize="40" fill="white">🛡️</text>
            </svg>
          </div>
          {["₹24L+ Paid Out", "99.2% Uptime", "< 10 sec Payout"].map((s, i) => (
            <motion.div key={s} animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 + i }} className={`absolute rounded-lg bg-slate-800/90 border border-slate-700 px-3 py-2 text-xs ${i === 0 ? "right-2 top-6" : i === 1 ? "left-3 bottom-10" : "left-0 top-20"}`}>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1 animate-pulse" />
              {s}
            </motion.div>
          ))}
        </div>
      </section>

      <section ref={statsRef} className="bg-slate-900/90 border-y border-slate-800 py-10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-4">
          {[
            { v: 12847, l: "Active Workers Protected" },
            { v: 2431500, l: "Total Payouts Credited", p: "₹" },
            { v: 48, l: "Average Rating", s: "★" },
            { v: 99, l: "Auto-trigger Accuracy", s: "%" },
          ].map((x) => (
            <div key={x.l} className="text-center">
              <p className="text-3xl font-bold text-teal-300">
                {statsInView ? <CountUp value={x.v} prefix={x.p} suffix={x.s} /> : 0}
              </p>
              <p className="text-xs text-slate-400 mt-1">{x.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-center mb-10">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-5">
          {["Sign Up & Verify", "Choose Your Plan", "Get Paid Automatically"].map((t, i) => (
            <motion.div key={t} initial={{ y: 40, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.2 }} className="rounded-xl bg-slate-800/80 p-6 border border-slate-700 hover:-translate-y-1 transition">
              <p className="text-teal-300 text-sm">Step {i + 1}</p>
              <p className="mt-2 font-semibold">{t}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-slate-50 text-slate-900 py-16">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            ["⚡", "Instant Payouts", "No claims. No waiting. Fully automatic."],
            ["🌧️", "Weather-Based Protection", "Smart triggers using real-time environmental data."],
            ["🤖", "AI Risk Engine", "Multi-factor risk evaluation for fairness."],
            ["🛡️", "Fraud Protection", "Advanced GPS spoofing detection using behavioral analysis."],
          ].map(([i, t, d], idx) => (
            <motion.div key={t} initial={{ rotateX: 90, opacity: 0 }} whileInView={{ rotateX: 0, opacity: 1 }} transition={{ delay: idx * 0.08 }} className="rounded-xl border bg-white p-5 hover:-translate-y-1 hover:shadow-xl transition">
              <p className="text-2xl">{i}</p>
              <p className="font-semibold mt-2">{t}</p>
              <p className="text-sm text-slate-600 mt-2">{d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="plans" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-5">
          {[
            { n: "Basic", p: "₹30", trigger: "Triggers at 60mm rain -> ₹200 payout" },
            { n: "Standard", p: "₹70", trigger: "Triggers at 30mm rain -> ₹500 payout" },
            { n: "Premium", p: "₹120", trigger: "Triggers at 10mm rain -> ₹1000 payout" },
          ].map((x, i) => (
            <motion.div
              key={x.n}
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                i === 1
                  ? "bg-gradient-to-br from-sky-500 to-teal-600 border-2 border-sky-400 text-white -translate-y-2"
                  : i === 2
                    ? "bg-slate-900 border-2 border-slate-700 text-white"
                    : "bg-white border-2 border-slate-200 text-slate-900"
              }`}
            >
              {i === 1 && (
                <span className="inline-flex rounded-full bg-amber-400 text-amber-950 text-xs font-semibold px-3 py-1">
                  Most Popular
                </span>
              )}
              <p className="font-semibold mt-2">{x.n}</p>
              <p className={`text-3xl font-bold mt-3 ${i === 2 ? "text-sky-400" : ""}`}>
                {x.p}<span className={`text-sm ${i === 0 ? "text-slate-500" : "text-slate-100"}`}>/week</span>
              </p>
              <p className={`text-sm mt-2 ${i === 0 ? "text-slate-700" : "text-slate-100"}`}>{x.trigger}</p>
              <ul className={`text-sm mt-3 space-y-1 ${i === 0 ? "text-slate-700" : "text-slate-100"}`}>
                <li className="flex items-center gap-2"><span className={i === 1 ? "text-teal-100" : i === 0 ? "text-sky-600" : "text-slate-300"}>✓</span>Auto trigger detection</li>
                <li className="flex items-center gap-2"><span className={i === 1 ? "text-teal-100" : i === 0 ? "text-sky-600" : "text-slate-300"}>✓</span>Weekly active coverage</li>
                <li className="flex items-center gap-2"><span className={i === 1 ? "text-teal-100" : i === 0 ? "text-sky-600" : "text-slate-300"}>✓</span>Fraud-safe payouts</li>
              </ul>
              <Link
                to="/plans"
                className={`mt-5 inline-flex w-full justify-center rounded-lg py-2.5 font-semibold ${
                  i === 1
                    ? "bg-white text-slate-900"
                    : i === 2
                      ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Select Plan
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold mb-6 text-center">FAQ</h3>
        <div className="space-y-3">
          {faqs.map(([q, a], i) => (
            <div key={q} className="rounded-xl border border-slate-700 bg-slate-900/70">
              <button className="w-full text-left px-4 py-3 font-medium flex justify-between" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{q}</span><span>{openFaq === i ? "▴" : "▾"}</span>
              </button>
              {openFaq === i && <div className="px-4 pb-4 text-sm text-slate-300">{a}</div>}
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-slate-950 border-t border-slate-800 py-10 text-slate-400 text-sm">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">
          <div>
            <p className="font-semibold text-white">Phoeraksha</p>
            <p className="mt-1">Real-time, weather-indexed income protection for India's gig workers.</p>
          </div>
          <div>
            <p className="font-semibold text-white mb-2">For Insurers</p>
            <a href="/admin/login" className="hover:text-white">Admin Portal</a>
          </div>
          <p className="md:text-right">© 2026 Phoeraksha. Powered by AI.</p>
        </div>
      </footer>
    </div>
  );
}
