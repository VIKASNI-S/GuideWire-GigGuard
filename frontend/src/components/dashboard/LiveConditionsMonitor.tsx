import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../services/api";
import type { RiskCurrentPayload } from "../../types/risk";
import { useDemo } from "../../context/DemoContext";

export type ChartPoint = {
  label: string;
  rainfall: number;
  temperature: number;
  aqi: number;
  wind: number;
  congestion: number;
  riskScore: number;
};

function jitter(base: number, pct = 0.08): number {
  const d = base * pct * (Math.random() * 2 - 1);
  return Math.max(0, base + d);
}

function seedHistory(cur: RiskCurrentPayload): ChartPoint[] {
  const pts: ChartPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    pts.push({
      label: i === 0 ? "Now" : `${i * 2} min ago`,
      rainfall: jitter(cur.rainfall),
      temperature: jitter(cur.temperature, 0.02),
      aqi: jitter(cur.aqi, 0.05),
      wind: jitter(cur.windSpeed, 0.1),
      congestion: Math.min(
        1,
        Math.max(0, jitter(cur.congestion, 0.06))
      ),
      riskScore: jitter(cur.riskScore, 0.05),
    });
  }
  pts[pts.length - 1] = {
    label: "Now",
    rainfall: cur.rainfall,
    temperature: cur.temperature,
    aqi: cur.aqi,
    wind: cur.windSpeed,
    congestion: cur.congestion,
    riskScore: cur.riskScore,
  };
  return pts;
}

function aqiColor(aqi: number): string {
  if (aqi < 50) return "#22c55e";
  if (aqi < 100) return "#eab308";
  if (aqi < 200) return "#f97316";
  return "#ef4444";
}

function aqiLabel(aqi: number): string {
  if (aqi < 50) return "Good";
  if (aqi < 100) return "Moderate";
  if (aqi < 200) return "Unhealthy";
  return "Hazardous";
}

function riskStroke(score: number): string {
  if (score < 35) return "#22c55e";
  if (score <= 65) return "#f59e0b";
  return "#ef4444";
}

type CardShellProps = {
  title: string;
  icon: React.ReactNode;
  children: ReactNode;
  badge: ReactNode;
  alert?: string;
  triggered?: boolean;
};

function CardShell({ title, icon, children, badge, alert, triggered }: CardShellProps) {
  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm transition-shadow ${
        triggered
          ? "border-red-500 ring-2 ring-red-200 animate-pulse"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        </div>
        {badge}
      </div>
      {alert && (
        <p className="text-xs font-semibold text-red-600 mb-2">{alert}</p>
      )}
      <div className="h-40">{children}</div>
    </div>
  );
}

export function LiveConditionsMonitor() {
  const { demoMode, activeScenario } = useDemo();
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [latest, setLatest] = useState<RiskCurrentPayload | null>(null);

  useEffect(() => {
    const tick = async () => {
      try {
        const { data } = await api.get<RiskCurrentPayload>("/api/risk/current");
        setLatest(data);
        setPoints((prev) => {
          if (prev.length === 0) return seedHistory(data);
          const row: ChartPoint = {
            label: "Now",
            rainfall: data.rainfall,
            temperature: data.temperature,
            aqi: data.aqi,
            wind: data.windSpeed,
            congestion: data.congestion,
            riskScore: data.riskScore,
          };
          const merged = [...prev.slice(-11), row];
          return merged.map((p, i) => ({
            ...p,
            label:
              i === merged.length - 1
                ? "Now"
                : `${(merged.length - 1 - i) * 2} min ago`,
          }));
        });
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!latest || points.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Loading live conditions…
      </div>
    );
  }

  const th = latest.thresholds;
  const tr = latest.triggers;

  const gaugeFill =
    latest.congestionPercent < 40
      ? "#22c55e"
      : latest.congestionPercent < 70
        ? "#f59e0b"
        : "#ef4444";
  const gaugeData = [
    { name: "c", value: latest.congestionPercent, fill: gaugeFill },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Live Conditions Monitor</h2>
      <p className="text-xs text-slate-500">
        {demoMode
          ? `🧪 Demo · Simulated data · Scenario: ${activeScenario} · Updated 2 min ago`
          : "📡 Live · OpenWeatherMap + TomTom · Updated every 2 minutes"}
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <CardShell
          title="Rainfall (mm)"
          icon={<i className="fa-solid fa-cloud-rain"></i>}
          triggered={tr.rainfall}
          alert={tr.rainfall ? "⚠️ TRIGGER ACTIVE" : undefined}
          badge={
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                tr.rainfall ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
              }`}
            >
              {latest.rainfall.toFixed(1)} mm
            </span>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Tooltip />
              <ReferenceLine
                y={th.rainfall}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: "Threshold", fill: "#ef4444", fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="rainfall"
                stroke="#3b82f6"
                fill="#93c5fd"
                fillOpacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardShell>

        <CardShell
          title="Temperature (°C)"
          icon={<i className="fa-solid fa-temperature-high"></i>}
          triggered={tr.temperature}
          alert={tr.temperature ? " Moderate Heat" : undefined}
          badge={
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
              {latest.temperature.toFixed(1)}°C
            </span>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis domain={[25, 50]} tick={{ fontSize: 9 }} />
              <Tooltip />
              <ReferenceLine
                y={th.temperature}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardShell>

        <CardShell
          title="Air Quality Index"
          icon={<i className="fa-regular fa-cloud"></i>}
          // <P>Good air quality</P>
          // triggered={tr.aqi}
          // alert={tr.aqi ? "Good air quality" : undefined}
          badge={
            <div className="text-right">
              <span
                className="text-lg font-bold"
                style={{ color: aqiColor(latest.aqi) }}
              >
                {Math.round(latest.aqi)}
              </span>
              <p className="text-[10px] font-medium" style={{ color: aqiColor(latest.aqi) }}>
                {aqiLabel(latest.aqi)}
              </p>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <ReferenceLine
                y={th.aqi}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />
              <Bar dataKey="aqi" radius={[4, 4, 0, 0]}>
                {points.map((e, i) => (
                  <Cell key={i} fill={aqiColor(e.aqi)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardShell>

        <CardShell
          title="Traffic Congestion"
          icon={<i className="fa-solid fa-car"></i>}
          triggered={tr.congestion}
          badge={
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800">
              {latest.congestionPercent}%
            </span>
          }
          alert={
            latest.isPeakTrafficHour ? "🚦 Peak Hours" : undefined
          }
        >
          <div className="h-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={120}>
              <RadialBarChart
                cx="50%"
                cy="80%"
                innerRadius="55%"
                outerRadius="100%"
                data={gaugeData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar dataKey="value" cornerRadius={4} />
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-slate-500 text-center -mt-2 px-2">
              {latest.roadName}
            </p>
          </div>
        </CardShell>

        <CardShell
          title="Wind Speed (km/h)"
          icon={<i className="fa-solid fa-wind"></i>}
          triggered={tr.wind}
          alert={tr.wind ? "Moderate wind speed" : undefined}
          badge={
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-900">
              {latest.windSpeed.toFixed(1)}
            </span>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 80]} tick={{ fontSize: 9 }} />
              <Tooltip />
              <ReferenceLine y={th.wind} stroke="#ef4444" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="wind"
                stroke="#14b8a6"
                fill="#5eead4"
                fillOpacity={0.35}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardShell>
      </div>

      <div
        className={`rounded-lg border bg-white p-4 ${
          latest.riskScore > 65
            ? "border-red-300"
            : latest.riskScore > 35
              ? "border-amber-200"
              : "border-emerald-200"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-900">
            Environmental Risk Score — Last 24 Minutes
          </h4>
          <span
            className="text-sm font-bold"
            style={{ color: riskStroke(latest.riskScore) }}
          >
            {latest.riskScore.toFixed(0)} ({latest.riskLevel})
          </span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Tooltip />
              <ReferenceLine y={35} stroke="#22c55e" strokeDasharray="2 2" />
              <ReferenceLine y={65} stroke="#f59e0b" strokeDasharray="2 2" />
              <Line
                type="monotone"
                dataKey="riskScore"
                stroke={riskStroke(latest.riskScore)}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, fill: riskStroke(latest.riskScore) }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
