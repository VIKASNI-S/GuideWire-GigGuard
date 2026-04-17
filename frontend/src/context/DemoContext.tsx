import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../services/api";

const LS_KEY = "phoeraksha_mock_demo_mode";

export type ScenarioKey =
  | "normal"
  | "heavy_rain"
  | "heatwave"
  | "flood"
  | "aqi_crisis"
  | "traffic_jam";

type DemoContextValue = {
  demoMode: boolean;
  activeScenario: ScenarioKey;
  loading: boolean;
  setDemoMode: (on: boolean) => Promise<void>;
  setScenario: (scenario: ScenarioKey) => Promise<void>;
  refresh: () => Promise<void>;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoModeState] = useState(false);
  const [activeScenario, setActiveScenarioState] =
    useState<ScenarioKey>("normal");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await api.get<{
      demoMode: boolean;
      activeScenario: ScenarioKey;
    }>("/api/mock/status");
    setDemoModeState(data.demoMode);
    setActiveScenarioState(data.activeScenario);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{
          demoMode: boolean;
          activeScenario: ScenarioKey;
        }>("/api/mock/status");
        if (cancelled) return;
        setDemoModeState(data.demoMode);
        setActiveScenarioState(data.activeScenario);

        const want = localStorage.getItem(LS_KEY);
        if (want === "true" && !data.demoMode) {
          await api.post("/api/mock/demo-mode", { active: true });
          const { data: d2 } = await api.get<{
            demoMode: boolean;
            activeScenario: ScenarioKey;
          }>("/api/mock/status");
          if (!cancelled) {
            setDemoModeState(d2.demoMode);
            setActiveScenarioState(d2.activeScenario);
          }
        }
      } catch {
        /* offline */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDemoMode = useCallback(async (on: boolean) => {
    await api.post("/api/mock/demo-mode", { active: on });
    localStorage.setItem(LS_KEY, on ? "true" : "false");
    await refresh();
  }, [refresh]);

  const setScenario = useCallback(
    async (scenario: ScenarioKey) => {
      await api.post("/api/mock/scenario", { scenario });
      await refresh();
    },
    [refresh]
  );

  const value: DemoContextValue = {
    demoMode,
    activeScenario,
    loading,
    setDemoMode,
    setScenario,
    refresh,
  };

  return (
    <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemo must be used within DemoProvider");
  }
  return ctx;
}
