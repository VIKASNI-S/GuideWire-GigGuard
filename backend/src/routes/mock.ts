import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  MOCK_SCENARIOS,
  type ScenarioKey,
  getActiveScenario,
  setActiveScenario,
  isDemoModeActive,
  setDemoMode,
  getMockWeather,
  getMockTraffic,
} from "../services/mockDataService";
import { requireDb } from "../db/index";
import { runTriggerForUser } from "../services/triggerService";

const router = Router();

const VALID_SCENARIOS = Object.keys(MOCK_SCENARIOS) as ScenarioKey[];

router.get("/scenarios", (_req: Request, res: Response) => {
  const scenarios = Object.entries(MOCK_SCENARIOS).map(([key, data]) => ({
    key,
    weatherDescription: data.weather.description,
    trafficDescription: data.traffic.description,
    triggerType: data.weather.triggerType,
    rainfall: data.weather.rainfallMmLastHour,
    temperature: data.weather.temperatureC,
    aqi: data.weather.aqi,
    congestion: Math.round(data.traffic.congestion * 100),
    roadClosure: data.traffic.roadClosure,
  }));
  res.json({ scenarios });
});

router.get("/status", (_req: Request, res: Response) => {
  const scenario = getActiveScenario();
  const on = isDemoModeActive();
  res.json({
    demoMode: on,
    activeScenario: scenario,
    weather: on ? getMockWeather() : null,
    traffic: on ? getMockTraffic() : null,
    scenarioData: on ? MOCK_SCENARIOS[scenario] : null,
  });
});

router.post("/demo-mode", authMiddleware, (req: Request, res: Response) => {
  const active = (req.body as { active?: boolean }).active;
  if (typeof active !== "boolean") {
    res.status(400).json({ error: "active must be a boolean" });
    return;
  }
  setDemoMode(active);
  res.json({ success: true, demoMode: active });
});

router.post("/scenario", authMiddleware, (req: Request, res: Response) => {
  const scenario = (req.body as { scenario?: string }).scenario as
    | ScenarioKey
    | undefined;
  if (!scenario || !VALID_SCENARIOS.includes(scenario)) {
    res.status(400).json({ error: "Invalid scenario", valid: VALID_SCENARIOS });
    return;
  }
  if (!isDemoModeActive()) {
    res.status(403).json({ error: "Enable demo mode first" });
    return;
  }
  setActiveScenario(scenario);
  res.json({
    success: true,
    scenario,
    data: MOCK_SCENARIOS[scenario],
  });
});

router.get("/weather", (_req: Request, res: Response) => {
  if (!isDemoModeActive()) {
    res
      .status(403)
      .json({ error: "Demo mode is OFF. Enable demo mode first." });
    return;
  }
  res.json(getMockWeather());
});

router.get("/traffic", (_req: Request, res: Response) => {
  if (!isDemoModeActive()) {
    res
      .status(403)
      .json({ error: "Demo mode is OFF. Enable demo mode first." });
    return;
  }
  res.json(getMockTraffic());
});

router.post("/force-trigger", authMiddleware, async (req: Request, res: Response) => {
  if (!isDemoModeActive()) {
    res.status(403).json({ error: "Demo mode must be ON to force trigger" });
    return;
  }
  try {
    const db = requireDb();
    const result = await runTriggerForUser(db, req.userId!);
    const msg =
      result.triggered && result.amount !== undefined
        ? `Payout of ₹${result.amount} triggered for ${result.triggerType ?? "event"}`
        : result.message;
    res.json({
      success: result.ok,
      triggered: result.triggered ?? false,
      triggerType: result.triggerType,
      amount: result.amount,
      reason: result.reason,
      ...result,
      message: msg,
    });
  } catch (e: unknown) {
    res.status(500).json({
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

export default router;
