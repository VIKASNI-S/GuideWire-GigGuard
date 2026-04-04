import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";
import { useDemo, type ScenarioKey } from "../../context/DemoContext";

type ScenarioRow = {
  key: ScenarioKey;
  weatherDescription: string;
  trafficDescription: string;
  triggerType: string;
  rainfall: number;
  temperature: number;
  aqi: number;
  congestion: number;
  roadClosure: boolean;
};

const SCENARIO_LABEL: Record<
  ScenarioKey,
  { emoji: string; label: string; hint: string }
> = {
  normal: {emoji: "🌤", label: "Normal", hint: "Baseline" },
  heavy_rain: { emoji: "🌧", label: "Heavy Rain", hint: "52 mm/h" },
  heatwave: {emoji :"🔥", label: "Heatwave", hint: "46°C" },
  flood: { emoji: "🌊", label: "Flood", hint: "98 mm + closure" },
  aqi_crisis: { emoji: "🏭", label: "AQI Crisis", hint: "AQI 335" },
  traffic_jam: { emoji: "🚦", label: "Traffic Jam", hint: "88% cong." },
};



type Props = {
  onAfterForce?: () => void | Promise<void>;
};

export function DemoModePanel({ onAfterForce }: Props) {
  const { demoMode, activeScenario, setDemoMode, setScenario, loading } =
    useDemo();
  const [rows, setRows] = useState<ScenarioRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ scenarios: ScenarioRow[] }>(
          "/api/mock/scenarios"
        );
        if (!cancelled) setRows(data.scenarios);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onToggle(next: boolean) {
    try {
      await setDemoMode(next);
      toast.success(next ? "Demo mode ON — mock weather & traffic" : "Real data mode");
    } catch {
      toast.error("Could not change demo mode");
    }
  }

  async function pickScenario(key: ScenarioKey) {
    if (!demoMode) {
      toast.error("Turn on Demo Mode first");
      return;
    }
    try {
      await setScenario(key);
      toast.success(`Scenario: ${SCENARIO_LABEL[key].label}`);
    } catch {
      toast.error("Could not set scenario");
    }
  }

  async function forceTrigger() {
    if (!demoMode) {
      toast.error("Demo mode must be ON");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const { data } = await api.post<{
        triggered?: boolean;
        amount?: number;
        triggerType?: string;
        message?: string;
        reason?: string;
      }>("/api/mock/force-trigger");
      if (data.triggered && data.amount !== undefined) {
        toast.success(
          `✅ ₹${data.amount} credited! Trigger: ${data.triggerType ?? "event"}`
        );
      } else {
        toast(
          `⏳ ${data.message ?? "No payout"}${data.reason ? ` (${data.reason})` : ""}`,
          { icon: "ℹ️" }
        );
      }
      await onAfterForce?.();
    } catch {
      toast.error("Force trigger failed — active policy & demo mode required");
    } finally {
      setBusy(false);
    }
  }

  const activeMeta = rows.find((r) => r.key === activeScenario);

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">Demo Mode</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              demoMode
                ? "bg-amber-200 text-amber-900"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {demoMode ? "DEMO" : "LIVE"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Real data</span>
          <button
            type="button"
            role="switch"
            aria-checked={demoMode}
            disabled={loading}
            onClick={() => void onToggle(!demoMode)}
            className={`relative inline-flex h-8 w-14 shrink-0 rounded-full transition-colors ${
              demoMode ? "bg-teal-500" : "bg-slate-300"
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-7 w-7 mt-0.5 rounded-full bg-white shadow transition-transform ${
                demoMode ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm font-medium text-slate-800">Demo</span>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Select a disruption scenario to test automatic payout triggers. Data source
        switches server-side — cron and force-trigger use the same engine as
        production.
      </p>

      {demoMode && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
            {(Object.keys(SCENARIO_LABEL) as ScenarioKey[]).map((key) => {
              const ui = SCENARIO_LABEL[key];
              const active = activeScenario === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void pickScenario(key)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    active
                      ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="text-lg">{ui.emoji}</div>
                  <div className="text-xs font-semibold text-slate-900 mt-1">
                    {ui.label}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{ui.hint}</div>
                  {active && (
                    <div className="text-[10px] text-teal-700 font-medium mt-1">
                      ✓ Active
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {activeMeta && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 mb-4">
              <p>
                <span className="font-semibold">Active:</span>{" "}
                {SCENARIO_LABEL[activeScenario].emoji}{" "}
                {SCENARIO_LABEL[activeScenario].label} — {activeMeta.weatherDescription}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Traffic: {activeMeta.trafficDescription}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void forceTrigger()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Running…
              </>
            ) : (
              <>⚡ Force trigger check now</>
            )}
          </button>
          <p className="text-xs text-slate-500 mt-2">
            Judging / demo only — runs the same trigger pipeline as the 10-minute
            cron.
          </p>
        </>
      )}
    </section>
  );
}
