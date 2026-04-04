import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { requireDb } from "../db/index";
import { users, riskAssessments, policies, plans } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { fetchWeatherForCoords } from "../services/weatherService";
import { fetchTrafficForCoords } from "../services/trafficService";
import {
  computeEnvironmentalRisk,
  riskLevelLabel,
} from "../utils/envRisk";
import {
  fetchRiskScores,
  fallbackRiskScores,
  buildMlFeaturesFromUser,
} from "../services/mlService";
import { isDemoModeActive as isMockDataDemoMode } from "../services/mockDataService";
import {
  demoThresholdsForTier,
  getISTHour,
  getThresholdPack,
  isDemoModeEnv,
  isPeakTrafficIST,
  windThreshold,
  windThresholdForPlan,
} from "../services/triggerEvaluation";

const router = Router();
router.use(authMiddleware);

router.get("/current", async (req: Request, res: Response) => {
  const db = requireDb();
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  if (!u) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const lat = u.latitude ? parseFloat(String(u.latitude)) : 13.0827;
  const lon = u.longitude ? parseFloat(String(u.longitude)) : 80.2707;

  let weather;
  let traffic;
  try {
    const [w, t] = await Promise.all([
      fetchWeatherForCoords(lat, lon),
      fetchTrafficForCoords(lat, lon),
    ]);
    weather = w;
    traffic = t;
  } catch (e) {
    res.status(502).json({
      error: "Weather or traffic service unavailable",
      detail: e instanceof Error ? e.message : String(e),
    });
    return;
  }

  const [polRow] = await db
    .select({ plan: plans })
    .from(policies)
    .innerJoin(plans, eq(policies.planId, plans.id))
    .where(and(eq(policies.userId, req.userId!), eq(policies.status, "active")))
    .limit(1);

  const demo = isDemoModeEnv() || isMockDataDemoMode();
  const pack = polRow
    ? getThresholdPack(polRow.plan, demo)
    : demoThresholdsForTier("standard");

  const rainTh = pack.rain;
  const envScore = computeEnvironmentalRisk({
    currentRainfallMm: weather.rainfallMmLastHour,
    planRainfallThresholdMm: rainTh,
    currentTempC: weather.temperatureC,
    currentAqi: weather.aqi,
    windSpeedKmh: weather.windSpeedKmh,
  });

  const label = riskLevelLabel(envScore);
  const windTh = polRow
    ? windThresholdForPlan(polRow.plan, demo)
    : windThreshold(demo);
  const now = new Date();
  const istHour = getISTHour(now);
  const peakTraffic = isPeakTrafficIST(istHour);

  const rainfall = weather.rainfallMmLastHour;
  const temperature = weather.temperatureC;
  const aqi = weather.aqi;
  const windSpeed = weather.windSpeedKmh;
  const congestion = traffic.congestionRatio;
  const congestionPercent = Math.round(congestion * 100);

  const thresholds = {
    rainfall: pack.rain,
    temperature: pack.heat,
    aqi: pack.aqi,
    congestion: pack.congestion,
    wind: windTh,
  };

  const triggers = {
    rainfall: rainfall > pack.rain,
    temperature: temperature >= pack.heat,
    aqi: aqi > pack.aqi,
    congestion: congestion > pack.congestion || traffic.roadClosure,
    wind: windSpeed > windTh,
  };

  res.json({
    environmentalRiskScore: Math.round(envScore * 10) / 10,
    riskScore: Math.round(envScore * 10) / 10,
    riskLevel: label,
    weather,
    traffic,
    city: u.city,
    rainfall,
    temperature,
    aqi,
    windSpeed,
    congestion,
    congestionPercent,
    roadName: traffic.roadName,
    thresholds,
    triggers,
    timestamp: now.toISOString(),
    istHour,
    isPeakTrafficHour: peakTraffic,
  });
});

router.get("/score", async (req: Request, res: Response) => {
  const db = requireDb();
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);
  if (!u) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const lat = u.latitude ? parseFloat(String(u.latitude)) : 13.0827;
  const lon = u.longitude ? parseFloat(String(u.longitude)) : 80.2707;

  let weather;
  try {
    weather = await fetchWeatherForCoords(lat, lon);
  } catch {
    weather = {
      rainfallMmLastHour: 0,
      temperatureC: 30,
      aqi: 100,
      windSpeedKmh: 10,
      rawWeather: {},
      rawAir: {},
    };
  }

  let trafficCongestion = 0.35;
  try {
    const t = await fetchTrafficForCoords(lat, lon);
    trafficCongestion = t.congestionRatio;
  } catch {
    /* keep default */
  }

  const features = buildMlFeaturesFromUser(
    {
      city: u.city,
      yearsExperience: u.yearsExperience,
      avgDailyOrders: u.avgDailyOrders,
      avgWeeklyIncome: u.avgWeeklyIncome,
      vehicleType: u.vehicleType,
      deliveryCategory: u.deliveryCategory,
      trustScore: u.trustScore,
      workingHoursPerDay: u.workingHoursPerDay,
    },
    {
      trafficCongestion,
      rainfall30Approx: weather.rainfallMmLastHour * 10,
      temperature: weather.temperatureC,
      aqi: weather.aqi,
    }
  );

  const ml = await fetchRiskScores(features);
  const scores =
    ml ??
    fallbackRiskScores({
      envRisk: 40,
      trustScore: u.trustScore ?? 70,
      orders: u.avgDailyOrders ?? 0,
    });

  res.json({ scores });
});

router.post("/assess", async (req: Request, res: Response) => {
  const db = requireDb();
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);
  if (!u) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const lat = u.latitude ? parseFloat(String(u.latitude)) : 13.0827;
  const lon = u.longitude ? parseFloat(String(u.longitude)) : 80.2707;

  let weather;
  try {
    weather = await fetchWeatherForCoords(lat, lon);
  } catch {
    weather = {
      rainfallMmLastHour: 0,
      temperatureC: 30,
      aqi: 100,
      windSpeedKmh: 10,
      rawWeather: {},
      rawAir: {},
    };
  }

  let trafficCongestion = 0.35;
  try {
    const t = await fetchTrafficForCoords(lat, lon);
    trafficCongestion = t.congestionRatio;
  } catch {
    /* keep default */
  }

  const features = buildMlFeaturesFromUser(
    {
      city: u.city,
      yearsExperience: u.yearsExperience,
      avgDailyOrders: u.avgDailyOrders,
      avgWeeklyIncome: u.avgWeeklyIncome,
      vehicleType: u.vehicleType,
      deliveryCategory: u.deliveryCategory,
      trustScore: u.trustScore,
      workingHoursPerDay: u.workingHoursPerDay,
    },
    {
      trafficCongestion,
      rainfall30Approx: weather.rainfallMmLastHour * 10,
      temperature: weather.temperatureC,
      aqi: weather.aqi,
    }
  );

  const ml = await fetchRiskScores(features);
  const scores =
    ml ??
    fallbackRiskScores({
      envRisk: 40,
      trustScore: u.trustScore ?? 70,
      orders: u.avgDailyOrders ?? 0,
    });

  const [planRow] = await db
    .select({ plan: plans })
    .from(policies)
    .innerJoin(plans, eq(policies.planId, plans.id))
    .where(and(eq(policies.userId, req.userId!), eq(policies.status, "active")))
    .limit(1);

  const basePrem = planRow
    ? parseFloat(String(planRow.plan.weeklyPremium))
    : 50;

  const [inserted] = await db
    .insert(riskAssessments)
    .values({
      userId: u.id,
      environmentalScore: scores.environmental,
      behaviorScore: scores.behavior,
      locationScore: scores.location,
      activityScore: scores.activity,
      trustScore: scores.trust,
      overallRiskScore: scores.overall,
      mlRecommendedPremium: String(basePrem),
    })
    .returning();

  res.status(201).json({ assessment: inserted, scores });
});

export default router;
