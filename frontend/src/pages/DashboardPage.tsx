import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { api } from "../services/api";
import type { PayoutHistoryRow, PlanRow, PolicyRow, RiskScores } from "../types";
import { RiskMap } from "../components/dashboard/RiskMap";
import { LiveConditionsMonitor } from "../components/dashboard/LiveConditionsMonitor";
import { DemoModePanel } from "../components/dashboard/DemoModePanel";
import { WeatherAlertBanner } from "../components/dashboard/WeatherAlertBanner";
import { useDemo } from "../context/DemoContext";

type ThresholdPack = {
  rain: number;
  heat: number;
  aqi: number;
  congestion: number;
  peakCongestion: number;
  wind: number;
  poorAqi: number;
};

type RealConditions = {
  temp: number;
  rainfall: number;
  aqi: number;
  wind: number;
  congestion: number;
  istHour: number;
  isPeakTrafficHour: boolean;
  peakTrafficWouldFire: boolean;
  demoMode: boolean;
  triggers_that_would_fire: string[];
  triggers_in_demo_mode: string[];
  triggers_in_prod_mode: string[];
  thresholds_demo: ThresholdPack | null;
  thresholds_prod: ThresholdPack | null;
  planName: string | null;
};

export function DashboardPage() {
  const { demoMode } = useDemo();
  const [policy, setPolicy] = useState<PolicyRow | null>(null);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [profile, setProfile] = useState<{
    fullName: string;
    city: string;
    trustScore: number | null;
    latitude: string | null;
    longitude: string | null;
  } | null>(null);
  const [riskLive, setRiskLive] = useState<{
    environmentalRiskScore: number;
    riskLevel: "Low" | "Medium" | "High";
    weather: { rainfallMmLastHour: number };
  } | null>(null);
  const [scores, setScores] = useState<RiskScores | null>(null);
  const [history, setHistory] = useState<PayoutHistoryRow[]>([]);
  const [stats, setStats] = useState({ totalEarnedWeek: 0, triggersThisWeek: 0 });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [realConditions, setRealConditions] = useState<RealConditions | null>(null);
  /** UI toggle: ON = show demo-style threshold lines; OFF = production threshold lines */
  const [showDemoThresholds, setShowDemoThresholds] = useState(true);
  const lastHistId = useRef<string | null>(null);
  const historyBootstrapped = useRef(false);

  const load = useCallback(async () => {
    try {
      const [pol, prof, risk, sc, hist, st, rc] = await Promise.all([
        api.get<{ policy: PolicyRow | null; plan: PlanRow | null }>(
          "/api/policy/current"
        ),
        api.get<{ profile: Record<string, unknown> }>("/api/user/profile"),
        api.get<{
          environmentalRiskScore: number;
          riskLevel: "Low" | "Medium" | "High";
          weather: { rainfallMmLastHour: number };
        }>("/api/risk/current"),
        api.get<{ scores: RiskScores }>("/api/risk/score"),
        api.get<{ items: PayoutHistoryRow[] }>("/api/payout/history?limit=20"),
        api.get<{ totalEarnedWeek: number; triggersThisWeek: number }>(
          "/api/payout/stats"
        ),
        api.get<RealConditions>("/api/demo/real-conditions"),
      ]);

      setPolicy(pol.data.policy);
      setPlan(pol.data.plan);
      const p = prof.data.profile;
      setProfile({
        fullName: String(p.fullName ?? ""),
        city: String(p.city ?? ""),
        trustScore: p.trustScore !== null && p.trustScore !== undefined ? Number(p.trustScore) : 70,
        latitude: p.latitude !== null && p.latitude !== undefined ? String(p.latitude) : null,
        longitude: p.longitude !== null && p.longitude !== undefined ? String(p.longitude) : null,
      });
      setRiskLive(risk.data);
      setScores(sc.data.scores);
      const items = hist.data.items;
      const newestId = items[0]?.id ?? null;
      if (!historyBootstrapped.current) {
        historyBootstrapped.current = true;
        if (newestId) lastHistId.current = newestId;
      } else if (newestId && newestId !== lastHistId.current) {
        if (newestId) lastHistId.current = newestId;
      }
      setHistory(items);
      setStats(st.data);
      setRealConditions(rc.data);
      setLastUpdated(new Date());
    } catch {
      toast.error("Could not refresh dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  const pollPayoutHistory = useCallback(async () => {
    try {
      const hist = await api.get<{ items: PayoutHistoryRow[] }>(
        "/api/payout/history?limit=20"
      );
      const items = hist.data.items;
      const newestId = items[0]?.id ?? null;
      if (
        historyBootstrapped.current &&
        newestId &&
        newestId !== lastHistId.current
      ) {
        const r = items[0]?.reason ?? "";
        const m = r.match(/^Auto:\s*(.+)$/);
        const triggerLabel = m ? m[1].trim() : "payout";
        toast.success(`Auto-triggered! ${triggerLabel} detected 🎯`);
        void confetti({ particleCount: 80, spread: 75, origin: { y: 0.7 } });
      }
      historyBootstrapped.current = true;
      if (newestId) lastHistId.current = newestId;
      setHistory(items);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const ping = async () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await api.post("/api/user/location-ping", {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracyMeters: Math.round(pos.coords.accuracy),
              source: "browser",
            });
          } catch {
            /* ignore */
          }
        },
        () => {
          /* ignore */
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
    };
    void ping();
    const id = setInterval(() => void ping(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => void pollPayoutHistory(), 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [pollPayoutHistory]);

  const radarData = useMemo(() => {
    const s = scores ?? {
      environmental: 60,
      behavior: 70,
      location: 55,
      activity: 65,
      trust: 80,
    };
    return [
      { subject: "Environmental", A: s.environmental, fullMark: 100 },
      { subject: "Behavior", A: s.behavior, fullMark: 100 },
      { subject: "Location", A: s.location, fullMark: 100 },
      { subject: "Activity", A: s.activity, fullMark: 100 },
      { subject: "Trust", A: s.trust, fullMark: 100 },
    ];
  }, [scores]);

  const lat = profile?.latitude ? parseFloat(profile.latitude) : 19.076;
  const lon = profile?.longitude ? parseFloat(profile.longitude) : 72.8777;
  const riskLevel = riskLive?.riskLevel ?? "Medium";
  const premiumDisplay = plan
    ? policy?.adjustedPremium ?? plan.weeklyPremium
    : "—";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 pb-16">
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {demoMode && (
          <div
            className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-2.5 text-center text-sm text-amber-950"
            role="status"
          >
            🧪 Demo Mode Active — using simulated weather & traffic data (toggle
            below)
          </div>
        )}
        <WeatherAlertBanner />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Hello, {profile?.fullName ?? "Rider"}
            </h1>
            <p className="text-slate-600 text-sm">
              Here&apos;s your live coverage snapshot.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Last updated:{" "}
            {Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 60000))}{" "}
            mins ago
          </p>
        </div>

        {!policy || !plan ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-amber-900">No active plan</h2>
              <p className="text-sm text-amber-800 mt-1">
                Subscribe to start automated income protection.
              </p>
            </div>
            <Link
              to="/plans"
              className="inline-flex justify-center rounded-lg bg-amber-600 text-white px-5 py-2 font-semibold"
            >
              View plans
            </Link>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Current plan
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">{plan.name}</p>
                <p className="text-teal-700 font-semibold mt-2">
                  ₹{(Number(premiumDisplay) - 50).toFixed(0)}/week
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  ML-adjusted premium shown here.
                </p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Weekly coverage
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-emerald-700">Active</span>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Valid until {policy.endDate}
                </p>
                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full w-3/5 bg-teal-500 rounded-full" />
                </div>
                <p className="text-xs text-slate-500 mt-2">4 of 7 days covered</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">
                  Payout status
                </p>
                <p className="text-lg font-bold text-emerald-700 mt-2">
                  ₹{stats.totalEarnedWeek.toFixed(0)} this week
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.triggersThisWeek} auto-trigger(s)
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Live risk level</h3>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    riskLevel === "Low" ? "bg-emerald-100 text-emerald-800" : 
                    riskLevel === "Medium" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {riskLevel} Risk
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          riskLevel === "Low"
                            ? "bg-emerald-500 w-1/3"
                            : riskLevel === "Medium"
                              ? "bg-amber-500 w-2/3"
                              : "bg-red-500 w-full"
                        }`}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase font-bold text-slate-400">
                      <div>Environmental: {scores?.environmental ?? 0}%</div>
                      <div>Behavioral: {scores?.behavior ?? 0}%</div>
                      <div>Location: {scores?.location ?? 0}%</div>
                      <div>Activity: {scores?.activity ?? 0}%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-900">Why {riskLevel}?</span>{" "}
                    {riskLevel === "Low" && "All environmental parameters and worker signals are within normal operating ranges."}
                    {riskLevel === "Medium" && "Moderate weather disruption or traffic congestion detected in your delivery zone."}
                    {riskLevel === "High" && "Critical environmental event detected. Activity drop verification in progress."}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-1">Trigger logic</h3>
                <p className="text-[10px] text-slate-500 mb-3 uppercase tracking-tighter">Automatic Verification Pipeline</p>
                <div className="space-y-3 text-sm">
                  {[
                    {
                      label: "Rainfall",
                      value: realConditions?.rainfall ?? riskLive?.weather?.rainfallMmLastHour ?? 0,
                      threshold: showDemoThresholds
                        ? (realConditions?.thresholds_demo?.rain ?? 30)
                        : (realConditions?.thresholds_prod?.rain ?? 30),
                      unit: "mm",
                    },
                    {
                      label: "Temp",
                      value: realConditions?.temp ?? 0,
                      threshold: showDemoThresholds
                        ? (realConditions?.thresholds_demo?.heat ?? 32)
                        : (realConditions?.thresholds_prod?.heat ?? 42),
                      unit: "°C",
                    },
                    {
                      label: "AQI",
                      value: realConditions?.aqi ?? 0,
                      threshold: showDemoThresholds
                        ? (realConditions?.thresholds_demo?.aqi ?? 80)
                        : (realConditions?.thresholds_prod?.aqi ?? 300),
                      unit: "",
                    },
                  ].map((r) => {
                    const pct = Math.round((r.value / Math.max(1, r.threshold)) * 100);
                    const bar =
                      pct < 70 ? "bg-emerald-500" : pct < 90 ? "bg-amber-500" : "bg-red-500";
                    return (
                      <div key={r.label}>
                        <div className="flex justify-between">
                          <span className="text-slate-600">{r.label}</span>
                          <span className="font-medium text-slate-900">
                            {r.value.toFixed(1)}{r.unit} / {r.threshold}{r.unit}
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${bar} transition-all duration-500`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-50">
                    <span className="text-xs font-bold text-slate-400 uppercase">Verification Rules</span>
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] rounded font-bold border border-emerald-100">GPS OK</span>
                      <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] rounded font-bold border border-indigo-100">ACTIVITY SCAN</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <i className="fa-solid fa-robot"></i> GigGuard Explainability
                </h3>
                <p className="text-emerald-100 text-sm mt-1 mb-4 opacity-80">
                  Transparency on why triggers occur and final payout decisions.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-emerald-950/40 rounded-lg p-4 border border-emerald-500/20">
                    <h4 className="text-xs font-bold uppercase text-emerald-400 mb-2">How it works</h4>
                    <ul className="text-xs space-y-2 text-emerald-50/80">
                      <li className="flex gap-2">
                        <span className="text-emerald-400 font-bold">1.</span>
                        Environment threshold is met (Weather/Traffic)
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-400 font-bold">2.</span>
                        Worker activity drop is verified (&lt; 60% of avg)
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-400 font-bold">3.</span>
                        GPS & Fraud checks pass automatically
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10">
                    <h4 className="text-xs font-bold uppercase text-white/60 mb-2">Latest Decision Status</h4>
                    {history[0] ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Final Decision</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                             history[0].status === "credited" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                          }`}>
                            {history[0].status === "credited" ? "PAYOUT APPROVED" : "IN REVIEW"}
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-100 line-clamp-2 italic leading-relaxed whitespace-pre-line">
                          {history[0].reason}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-white/40 italic">Waiting for first trigger...</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
            </div>

            <LiveConditionsMonitor />

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">AI risk analysis</h3>
                  <div className="flex gap-2">
                     <div className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span> Current</div>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Score"
                        dataKey="A"
                        stroke="#0d9488"
                        strokeWidth={2}
                        fill="#14b8a6"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 leading-relaxed text-center px-4">
                  The radar reflects 5 core dimensions. Environmental triggers are prioritized, while behavior and trust influence your ML-adjusted premium.
                </div>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3">Live coverage map</h3>
                <RiskMap
                  lat={lat}
                  lon={lon}
                  riskLevel={riskLevel}
                  label={profile?.fullName ?? "Rider"}
                  planName={plan.name}
                />
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Payout history</h3>
                <button className="text-xs font-bold text-teal-600 hover:text-teal-700">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="pb-3 pr-4 font-semibold uppercase text-[10px]">Date</th>
                      <th className="pb-3 pr-4 font-semibold uppercase text-[10px]">Explainability / Reason</th>
                      <th className="pb-3 pr-4 font-semibold uppercase text-[10px]">Amount</th>
                      <th className="pb-3 font-semibold uppercase text-[10px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic">No payouts yet. Your income is protected.</td></tr>
                    )}
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pr-4 whitespace-nowrap text-slate-600 text-[11px]">
                          {h.createdAt
                            ? new Date(h.createdAt).toLocaleDateString() + ' ' + new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "—"}
                        </td>
                        <td className="py-4 pr-4">
                           <div className="text-xs font-medium text-slate-900 mb-1">Trigger Event Detected</div>
                           <div className="text-[10px] text-slate-500 leading-snug whitespace-pre-line bg-slate-50 p-2 rounded border border-slate-100 max-w-sm">
                             {h.reason ?? "Environmental threshold met. Normal verification."}
                           </div>
                        </td>
                        <td className="py-4 pr-4 font-bold text-slate-900 whitespace-nowrap">₹{Number(h.amount).toFixed(0)}</td>
                        <td className="py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm ${
                              h.status === "credited"
                                ? "bg-emerald-500 text-white"
                                : h.status === "Under Review" || h.status === "fraud_held"
                                  ? "bg-amber-500 text-white"
                                  : "bg-slate-400 text-white"
                            }`}
                          >
                            {h.status === "fraud_held" ? "Under Review" : (h.status ?? "Processing")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 items-start">
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4">Coverage Thresholds</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                    <p className="text-xs font-bold text-teal-800 uppercase mb-1">{plan.name} Tier</p>
                    <p className="text-[11px] text-teal-700 leading-relaxed">
                      Your payout triggers automatically when environmental values exceed the thresholds defined below. 
                      In {showDemoThresholds ? 'Simulation' : 'Production'} mode, these values are verified against 3-point triangulation.
                    </p>
                  </div>
                  {realConditions && (showDemoThresholds ? realConditions.thresholds_demo : realConditions.thresholds_prod) && (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(showDemoThresholds ? realConditions.thresholds_demo! : realConditions.thresholds_prod!).map(([key, val]) => (
                        <div key={key} className="border-l-2 border-teal-500 pl-3">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{key}</p>
                          <p className="text-lg font-bold text-slate-800">{val}{key === 'rain' ? 'mm' : key === 'heat' ? '°C' : ''}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${demoMode ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    System Mode
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Environment:{" "}
                    {demoMode ? (
                      <span className="text-emerald-600 font-bold">SIMULATION ACTIVE</span>
                    ) : (
                      <span className="text-slate-600 font-bold">LIVE PRODUCTION</span>
                    )}{" "}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <span className="text-[10px] font-bold uppercase text-slate-400">View Mode</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showDemoThresholds}
                    onClick={() => setShowDemoThresholds((v) => !v)}
                    className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors ${
                      showDemoThresholds ? "bg-teal-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform ${
                        showDemoThresholds ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-[10px] font-bold text-slate-600 w-12 text-center bg-slate-100 rounded py-1 border border-slate-200">
                    {showDemoThresholds ? "TEST" : "PROD"}
                  </span>
                </label>
              </div>

              {realConditions &&
                (showDemoThresholds
                  ? realConditions.thresholds_demo
                  : realConditions.thresholds_prod) && (
                  <div className="mb-4 rounded-lg border border-teal-100 bg-teal-50/20 p-4 text-xs space-y-3">
                    <p className="font-bold text-teal-900 uppercase tracking-wide border-b border-teal-100 pb-2">
                       Verification Status ({showDemoThresholds ? "Sim" : "Live"})
                    </p>
                    {(() => {
                      const t = showDemoThresholds
                        ? realConditions.thresholds_demo
                        : realConditions.thresholds_prod;
                      if (!t) return null;
                      const heatMet = realConditions.temp >= t.heat;
                      const trafficMet = realConditions.congestion >= t.congestion; // Simplified for speed
                      const aqiMet = realConditions.aqi > t.aqi;
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Ambient Temperature</span>
                            <span className={`font-bold ${heatMet ? 'text-rose-600' : 'text-slate-900'}`}>{realConditions.temp.toFixed(1)}°C {heatMet ? '✓' : '×'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Air Quality Index</span>
                            <span className={`font-bold ${aqiMet ? 'text-rose-600' : 'text-slate-900'}`}>{Math.round(realConditions.aqi)} AQI {aqiMet ? '✓' : '×'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Traffic Congestion</span>
                            <span className={`font-bold ${trafficMet ? 'text-rose-600' : 'text-slate-900'}`}>{(realConditions.congestion * 100).toFixed(0)}% {trafficMet ? '✓' : '×'}</span>
                          </div>
                          
                          <div className="pt-2 text-[10px] text-slate-500 italic border-t border-teal-50/50">
                            Current active triggers:{" "}
                            <span className="text-teal-700 font-bold">
                            {realConditions.triggers_that_would_fire.length
                              ? realConditions.triggers_that_would_fire.join(", ")
                              : "No thresholds exceeded"}{" "}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <DemoModePanel onAfterForce={() => void load()} />
      </main>
    </div>
  );
}
