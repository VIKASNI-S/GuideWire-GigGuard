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
import { eq, and, desc } from "drizzle-orm";
import { users, policies, plans } from "../db/schema";
import { 
  buildWeatherState, 
  getISTHour, 
  getThresholdPack, 
  isDemoModeEnv, 
  isPeakTrafficIST, 
  listTriggersThatWouldFire,
  windThresholdForPlan,
  windThreshold,
  poorAqiThreshold
} from "../services/triggerEvaluation";

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

router.get("/real-conditions", authMiddleware, async (req: Request, res: Response) => {
  const db = requireDb();
  const userId = req.userId!;

  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const lat = Number(u.latitude ?? 13.0827);
  const lon = Number(u.longitude ?? 80.2707);

  const [polRow] = await db
    .select({ policy: policies, plan: plans })
    .from(policies)
    .innerJoin(plans, eq(policies.planId, plans.id))
    .where(and(eq(policies.userId, userId), eq(policies.status, "active")))
    .orderBy(desc(policies.createdAt))
    .limit(1);

  const on = isDemoModeActive();
  const weather = on ? getMockWeather() : { rainfallMmLastHour: 2, temperatureC: 28, aqi: 50, windSpeedKmh: 10 };
  const traffic = on ? { congestionRatio: getMockTraffic().congestion, roadClosure: getMockTraffic().roadClosure } : { congestionRatio: 0.1, roadClosure: false };
  
  const wState = buildWeatherState(weather, traffic);
  const now = new Date();
  const istHour = getISTHour(now);
  const demoFlag = isDemoModeEnv() || on;
  
  const planRow = polRow?.plan ?? null;
  const triggersActive = planRow ? listTriggersThatWouldFire(wState, planRow, demoFlag, now) : [];
  const td = planRow ? getThresholdPack(planRow, true) : null;
  const tp = planRow ? getThresholdPack(planRow, false) : null;

  res.json({
    temp: wState.temp,
    rainfall: wState.rainfall,
    aqi: wState.aqi,
    wind: wState.wind,
    congestion: wState.congestion,
    istHour,
    isPeakTrafficHour: isPeakTrafficIST(istHour),
    demoMode: demoFlag,
    triggers_that_would_fire: triggersActive,
    thresholds_demo: td ? { ...td, peakCongestion: 0.2, wind: planRow ? windThresholdForPlan(planRow, true) : windThreshold(true), poorAqi: poorAqiThreshold(true) } : null,
    thresholds_prod: tp ? { ...tp, peakCongestion: 0.2, wind: planRow ? windThresholdForPlan(planRow, false) : windThreshold(false), poorAqi: poorAqiThreshold(false) } : null,
    planName: planRow?.name ?? null,
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
  const scenario = (req.body as { scenario?: string }).scenario as ScenarioKey;
  if (!scenario || !VALID_SCENARIOS.includes(scenario)) {
    res.status(400).json({ error: "Invalid scenario" });
    return;
  }
  setActiveScenario(scenario);
  res.json({ success: true, scenario });
});

router.post("/force-trigger", authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = requireDb();
    const result = await runTriggerForUser(db, req.userId!);
    res.json({
      success: result.ok,
      triggered: result.triggered ?? false,
      triggerType: result.triggerType,
      amount: result.amount,
      message: result.message,
      reason: result.reason,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
