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
                <h3 className="font-semibold text-slate-900">Live risk level</h3>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-3xl">
                    {riskLevel === "Low" ? "" : riskLevel === "Medium" ? "" : ""}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{riskLevel}</p>
                    <div className="h-2 mt-2 rounded-full bg-slate-100">
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
                    <p className="text-xs text-slate-500 mt-1">
                      Environmental risk score:{" "}
                      {riskLive?.environmentalRiskScore.toFixed(0) ?? "—"}/100
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900">Real-time trigger progress</h3>
                <div className="mt-4 space-y-3 text-sm">
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
                            {r.value.toFixed(1)}{r.unit} / {r.threshold}{r.unit} ({pct}%)
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
                  <div className="pt-2 text-xs text-slate-500">
                    Location: {profile?.city} <span className="text-emerald-600">Verified ✓</span>
                  </div>
                </div>
              </div>
            </div>

            <LiveConditionsMonitor />

            <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-4">AI risk analysis</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Score"
                      dataKey="A"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-3">Your area</h3>
              <RiskMap
                lat={lat}
                lon={lon}
                riskLevel={riskLevel}
                label={profile?.fullName ?? "Rider"}
                planName={plan.name}
              />
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 overflow-x-auto">
              <h3 className="font-semibold text-slate-900 mb-4">Payout history</h3>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Trigger</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {h.createdAt
                          ? new Date(h.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-2 pr-4">{h.reason ?? "—"}</td>
                      <td className="py-2 pr-4">₹{h.amount ?? "—"}</td>
                      <td className="py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            h.status === "credited"
                              ? "bg-emerald-100 text-emerald-800"
                              : h.status === "Under Review"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {h.status ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 items-start">
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-4">Threshold details</h3>
                <div className="h-64">
                  <p className="text-sm text-slate-600">
                    Toggle below to compare demo and production thresholds.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900"> Demo mode</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Server{" "}
                    <code className="bg-slate-100 px-1 rounded">DEMO_MODE</code>:{" "}
                    {realConditions?.demoMode ? (
                      <span className="text-emerald-600 font-medium">ON</span>
                    ) : (
                      <span className="text-slate-600 font-medium">OFF</span>
                    )}{" "}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                  <span className="font-medium">Threshold view</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showDemoThresholds}
                    onClick={() => setShowDemoThresholds((v) => !v)}
                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                      showDemoThresholds ? "bg-teal-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform ${
                        showDemoThresholds ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs text-slate-500 w-28">
                    {showDemoThresholds ? "Demo ON" : "Prod ON"}
                  </span>
                </label>
              </div>

              {realConditions &&
                (showDemoThresholds
                  ? realConditions.thresholds_demo
                  : realConditions.thresholds_prod) && (
                  <div className="mb-4 rounded-lg border border-teal-100 bg-teal-50/60 p-4 text-sm space-y-2">
                    <p className="text-xs font-semibold text-teal-900 uppercase tracking-wide">
                      Real data vs{" "}
                      {showDemoThresholds ? "demo" : "production"} thresholds
                      {realConditions.planName
                        ? ` · ${realConditions.planName}`
                        : ""}
                    </p>
                    {(() => {
                      const t = showDemoThresholds
                        ? realConditions.thresholds_demo
                        : realConditions.thresholds_prod;
                      if (!t) return null;
                      const heatMet = realConditions.temp >= t.heat;
                      const trafficMet = realConditions.peakTrafficWouldFire;
                      const aqiMet = realConditions.aqi > t.poorAqi;
                      return (
                        <>
                          <p className="text-slate-800">
                            Heat triggers at {t.heat}°C (now:{" "}
                            {realConditions.temp.toFixed(1)}°C){" "}
                            {heatMet ?  (
                                 <i className="fa-solid fa-circle-check text-emerald-600"></i>) : (
                                  <i className="fa-solid fa-circle-xmark text-rose-600"></i>
                                      )}
                          </p>
                          <p className="text-slate-800">
                            Peak-hour traffic: &gt;
                            {(t.peakCongestion * 100).toFixed(0)}% congestion during
                            8–10 / 18–21 IST (now:{" "}
                            {(realConditions.congestion * 100).toFixed(0)}%
                            {realConditions.isPeakTrafficHour
                              ? ", in peak window"
                              : ", off-peak"}
                            ) {trafficMet ? (
                                 <i className="fa-solid fa-circle-check text-emerald-600"></i>) : (
                                  <i className="fa-solid fa-circle-xmark text-rose-600"></i>
                                      )}
                          </p>
                          <p className="text-slate-800">
                            Poor-air tier: AQI &gt; {t.poorAqi} (now: ~
                            {Math.round(realConditions.aqi)}) {aqiMet ? (
                                 <i className="fa-solid fa-circle-check text-emerald-600"></i>) : (
                                  <i className="fa-solid fa-circle-xmark text-rose-600"></i>
                                      )}
                          </p>
                          <p className="text-xs text-slate-500 pt-1 border-t border-teal-100">
                            Would fire (demo eval):{" "}
                            {realConditions.triggers_in_demo_mode.length
                              ? realConditions.triggers_in_demo_mode.join(", ")
                              : "—"}{" "}
                            · (prod eval):{" "}
                            {realConditions.triggers_in_prod_mode.length
                              ? realConditions.triggers_in_prod_mode.join(", ")
                              : "—"}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Simulation controls moved to the unified Demo Mode panel below.
                </p>
              </div>
            </div>
          </>
        )}

        <DemoModePanel onAfterForce={() => void load()} />
      </main>
    </div>
  );
}
