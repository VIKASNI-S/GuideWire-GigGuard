import { Router, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireDb } from "../db/index";
import { policies, plans, users } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { demoSimulateSchema } from "../validation/schemas";
import { runTriggerForPolicy } from "../services/triggerService";
import { fetchWeatherForCoords } from "../services/weatherService";
import { fetchTrafficForCoords } from "../services/trafficService";
import { isDemoModeActive as isMockDataDemoMode } from "../services/mockDataService";
import {
  buildWeatherState,
  getISTHour,
  getThresholdPack,
  isDemoModeEnv,
  isPeakTrafficIST,
  listTriggersThatWouldFire,
  poorAqiThreshold,
  windThreshold,
  windThresholdForPlan,
} from "../services/triggerEvaluation";

const router = Router();
router.use(authMiddleware);

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v));
}

async function activePolicyForUser(db: ReturnType<typeof requireDb>, userId: string) {
  const [p] = await db
    .select({ id: policies.id })
    .from(policies)
    .where(and(eq(policies.userId, userId), eq(policies.status, "active")))
    .orderBy(desc(policies.createdAt))
    .limit(1);
  return p;
}

router.get("/real-conditions", async (req: Request, res: Response) => {
  const db = requireDb();
  const userId = req.userId!;

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const lat = u.latitude ? num(u.latitude) : 13.0827;
  const lon = u.longitude ? num(u.longitude) : 80.2707;

  const [polRow] = await db
    .select({ policy: policies, plan: plans })
    .from(policies)
    .innerJoin(plans, eq(policies.planId, plans.id))
    .where(and(eq(policies.userId, userId), eq(policies.status, "active")))
    .orderBy(desc(policies.createdAt))
    .limit(1);

  const weather = await fetchWeatherForCoords(lat, lon);
  const traffic = await fetchTrafficForCoords(lat, lon);
  const wState = buildWeatherState(weather, traffic);
  const now = new Date();
  const istHour = getISTHour(now);
  const demoFlag = isDemoModeEnv() || isMockDataDemoMode();
  const peakHour = isPeakTrafficIST(istHour);
  const peakTrafficWouldFire = peakHour && wState.congestion > 0.2;

  const planRow = polRow?.plan ?? null;
  const triggersDemo = planRow
    ? listTriggersThatWouldFire(wState, planRow, true, now)
    : [];
  const triggersProd = planRow
    ? listTriggersThatWouldFire(wState, planRow, false, now)
    : [];
  const triggersActive = planRow
    ? listTriggersThatWouldFire(wState, planRow, demoFlag, now)
    : [];

  const td = planRow ? getThresholdPack(planRow, true) : null;
  const tp = planRow ? getThresholdPack(planRow, false) : null;

  res.json({
    temp: wState.temp,
    rainfall: wState.rainfall,
    aqi: wState.aqi,
    wind: wState.wind,
    congestion: wState.congestion,
    istHour,
    isPeakTrafficHour: peakHour,
    peakTrafficWouldFire,
    demoMode: demoFlag,
    triggers_that_would_fire: triggersActive,
    triggers_in_demo_mode: triggersDemo,
    triggers_in_prod_mode: triggersProd,
    thresholds_demo:
      td === null
        ? null
        : {
            ...td,
            peakCongestion: 0.2,
            wind: planRow
              ? windThresholdForPlan(planRow, true)
              : windThreshold(true),
            poorAqi: poorAqiThreshold(true),
          },
    thresholds_prod:
      tp === null
        ? null
        : {
            ...tp,
            peakCongestion: 0.2,
            wind: planRow
              ? windThresholdForPlan(planRow, false)
              : windThreshold(false),
            poorAqi: poorAqiThreshold(false),
          },
    planName: planRow?.name ?? null,
    latitude: lat,
    longitude: lon,
  });
});

router.post(
  "/simulate-rain",
  validateBody(demoSimulateSchema),
  async (req: Request, res: Response) => {
    const body = (req as Request & { validatedBody: z.infer<typeof demoSimulateSchema> })
      .validatedBody;
    const uid = req.userId!;
    const db = requireDb();
    const p = await activePolicyForUser(db, uid);
    if (!p) {
      res.status(400).json({ error: "No active policy" });
      return;
    }
    const rainfallMm = body.rainfallMm ?? 55;
    const result = await runTriggerForPolicy(db, p.id, {
      overrideWeather: { rainfallMm },
    });
    res.json({ ...result, injected: { rainfallMm } });
  }
);

router.post(
  "/simulate-heatwave",
  validateBody(demoSimulateSchema),
  async (req: Request, res: Response) => {
    const body = (req as Request & { validatedBody: z.infer<typeof demoSimulateSchema> })
      .validatedBody;
    const uid = req.userId!;
    const db = requireDb();
    const p = await activePolicyForUser(db, uid);
    if (!p) {
      res.status(400).json({ error: "No active policy" });
      return;
    }
    const tempC = body.tempC ?? 46;
    const result = await runTriggerForPolicy(db, p.id, {
      overrideWeather: { tempC, rainfallMm: 0, aqi: 80 },
    });
    res.json({ ...result, injected: { tempC } });
  }
);

router.post(
  "/simulate-traffic",
  validateBody(demoSimulateSchema),
  async (req: Request, res: Response) => {
    const body = (req as Request & { validatedBody: z.infer<typeof demoSimulateSchema> })
      .validatedBody;
    const uid = req.userId!;
    const db = requireDb();
    const p = await activePolicyForUser(db, uid);
    if (!p) {
      res.status(400).json({ error: "No active policy" });
      return;
    }
    const congestion = body.congestion ?? 0.9;
    const result = await runTriggerForPolicy(db, p.id, {
      overrideWeather: { rainfallMm: 0, tempC: 30, aqi: 80 },
      overrideTraffic: { congestion },
    });
    res.json({ ...result, injected: { congestion } });
  }
);

export default router;
