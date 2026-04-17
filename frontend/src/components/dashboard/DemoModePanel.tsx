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
  { icon: string; label: string; hint: string }
> = {
  normal: { icon: "fa-solid fa-cloud-sun", label: "Normal", hint: "Baseline" },
  heavy_rain: { icon: "fa-solid fa-cloud-showers-heavy", label: "Heavy Rain", hint: "52 mm/h" },
  heatwave: { icon: "fa-solid fa-fire", label: "Heatwave", hint: "46°C" },
  flood: { icon: "fa-solid fa-water", label: "Flood", hint: "98 mm + closure" },
  aqi_crisis: { icon: "fa-solid fa-smog", label: "AQI Crisis", hint: "AQI 335" },
  traffic_jam: { icon: "fa-solid fa-traffic-light", label: "Traffic Jam", hint: "88% cong." }
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
    <section className="mt-10 border-t border-slate-200 pt-8 pb-10">
      <div className="bg-slate-950 rounded-2xl p-6 text-white shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                <i className="fa-solid fa-vial text-amber-500"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold">Simulation Control Center</h2>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Judge & Demo Environment</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-500 uppercase">Live Pipeline</span>
              <button
                type="button"
                role="switch"
                aria-checked={demoMode}
                disabled={loading}
                onClick={() => void onToggle(!demoMode)}
                className={`relative inline-flex h-8 w-16 shrink-0 rounded-full transition-all duration-300 ${demoMode ? "bg-amber-500" : "bg-slate-700"
                  } disabled:opacity-50 shadow-inner`}
              >
                <span
                  className={`inline-block h-6 w-6 mt-1 rounded-full bg-white shadow-lg transition-transform duration-300 ${demoMode ? "translate-x-9" : "translate-x-1"
                    }`}
                />
              </button>
              <span className={`text-xs font-bold uppercase ${demoMode ? 'text-amber-500' : 'text-slate-500'}`}>SIM</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6 max-w-2xl leading-relaxed">
            Switch between real-world data and disruption scenarios. When simulation is active, the system injects mock environmental data into the same
            <span className="text-white font-bold"> Decision Engine </span> used in production.
          </p>

          {demoMode && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {(Object.keys(SCENARIO_LABEL) as ScenarioKey[]).map((key) => {
                  const ui = SCENARIO_LABEL[key];
                  const active = activeScenario === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => void pickScenario(key)}
                      className={`rounded-xl border transition-all duration-300 p-4 text-left group ${active
                        ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                        }`}
                    >
                      <div className={`text-2xl mb-2 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{ui.emoji}</div>
                      <div className={`text-xs font-bold uppercase tracking-tight ${active ? 'text-amber-500' : 'text-slate-300'}`}>
                        {ui.label}
                      </div>
                      <div className="text-[9px] font-medium text-slate-500 mt-1">{ui.hint}</div>
                      {active && (
                        <div className="mt-2 h-1 w-full bg-amber-500/20 rounded-full overflow-hidden">
                          <div className="h-full w-full bg-amber-500 animate-pulse"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-slate-900/80 rounded-xl p-4 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Current Context
                  </div>
                  {activeMeta ? (
                    <div className="text-xs text-slate-300 space-y-1">
                      <p><span className="text-slate-500">Weather:</span> {activeMeta.weatherDescription}</p>
                      <p><span className="text-slate-500">Traffic:</span> {activeMeta.trafficDescription}</p>
                    </div>
                  ) : <p className="text-xs text-slate-500 italic">No scenario selected</p>}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void forceTrigger()}
                    className="h-full inline-flex items-center gap-3 rounded-xl bg-white px-6 py-4 text-sm font-black text-slate-950 hover:bg-slate-100 transition-colors disabled:opacity-50 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                  >
                    {busy ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                        Verifying Logic…
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-bolt-lightning text-amber-500"></i>
                        EXECUTE TRIGGER CHECK
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-800/50 flex items-start gap-3">
                <i className="fa-solid fa-circle-info text-slate-500 mt-0.5"></i>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Note: In simulation mode, the Activity Drop Logic is scenario-linked. For example, selecting
                  <span className="text-slate-300 font-bold"> Flood </span> will simulate 10-40% worker activity to test
                  payout verification rules.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none"></div>
      </div>
    </section>
  );
}
