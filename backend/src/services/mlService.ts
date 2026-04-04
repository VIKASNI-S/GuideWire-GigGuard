import axios from "axios";

export interface MlPremiumFeatures {
  city_flood_risk_score: number;
  avg_rainfall_last_30_days: number;
  avg_temperature_last_30_days: number;
  avg_aqi_last_30_days: number;
  worker_experience_years: number;
  avg_daily_orders: number;
  avg_weekly_income: number;
  vehicle_type_encoded: number;
  delivery_category_encoded: number;
  trust_score: number;
  traffic_congestion_avg: number;
  working_hours_per_day: number;
  month: number;
  is_coastal_city: number;
  day_of_week: number;
  city_name?: string;
}

export interface MlRiskFeatures extends MlPremiumFeatures {}

const COASTAL_KEYS = [
  "chennai",
  "mumbai",
  "kochi",
  "vishakhapatnam",
  "visakhapatnam",
] as const;

const FLOOD_BY_CITY: Record<string, number> = {
  chennai: 72,
  mumbai: 85,
  delhi: 45,
  bangalore: 38,
  kolkata: 78,
  hyderabad: 42,
  pune: 40,
  ahmedabad: 35,
  jaipur: 25,
  lucknow: 48,
};

export function isCoastalCityFlag(city: string): number {
  const c = city.toLowerCase();
  return COASTAL_KEYS.some((k) => c.includes(k)) ? 1 : 0;
}

export function cityFloodRiskScore(city: string): number {
  const c = city.toLowerCase();
  for (const [k, v] of Object.entries(FLOOD_BY_CITY)) {
    if (c.includes(k)) return v;
  }
  return 45;
}

/** Python weekday: Monday=0 … Sunday=6 */
export function jsToPythonWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function buildMlFeaturesFromUser(
  u: {
    city: string;
    yearsExperience: number | null;
    avgDailyOrders: number | null;
    avgWeeklyIncome: string | number | null;
    vehicleType: string | null;
    deliveryCategory: string | null;
    trustScore: number | null;
    workingHoursPerDay: string | number | null;
  },
  ctx: {
    trafficCongestion: number;
    rainfall30Approx: number;
    temperature: number;
    aqi: number;
    at?: Date;
  }
): MlPremiumFeatures {
  const at = ctx.at ?? new Date();
  return {
    city_flood_risk_score: cityFloodRiskScore(u.city),
    avg_rainfall_last_30_days: ctx.rainfall30Approx,
    avg_temperature_last_30_days: ctx.temperature,
    avg_aqi_last_30_days: ctx.aqi,
    worker_experience_years: u.yearsExperience ?? 0,
    avg_daily_orders: u.avgDailyOrders ?? 0,
    avg_weekly_income: parseFloat(String(u.avgWeeklyIncome ?? 0)),
    vehicle_type_encoded: encodeVehicle(u.vehicleType),
    delivery_category_encoded: encodeCategory(u.deliveryCategory),
    trust_score: u.trustScore ?? 70,
    traffic_congestion_avg: ctx.trafficCongestion,
    working_hours_per_day: parseFloat(String(u.workingHoursPerDay ?? 8)),
    month: at.getMonth() + 1,
    is_coastal_city: isCoastalCityFlag(u.city),
    day_of_week: jsToPythonWeekday(at),
    city_name: u.city,
  };
}

function encodeVehicle(v: string | null): number {
  const m: Record<string, number> = {
    cycle: 0,
    bike: 1,
    scooter: 2,
    auto: 3,
    other: 1,
  };
  return v ? (m[v.toLowerCase()] ?? 1) : 1;
}

function encodeCategory(v: string | null): number {
  const m: Record<string, number> = {
    food: 0,
    grocery: 1,
    ecommerce: 2,
  };
  return v ? (m[v.toLowerCase()] ?? 0) : 0;
}

export async function predictPremiumMultiplier(
  features: MlPremiumFeatures,
  basePremium: number
): Promise<{ multiplier: number; adjustedPremium: number; basePremium: number }> {
  const baseUrl = process.env.ML_SERVICE_URL ?? "http://localhost:8000";
  try {
    const { data } = await axios.post<{
      multiplier: number;
      adjusted_premium: number;
      base_premium?: number;
    }>(
      `${baseUrl}/predict-premium`,
      {
        features,
        base_premium: basePremium,
        city_name: features.city_name,
      },
      { timeout: 8000 }
    );
    return {
      multiplier: data.multiplier,
      adjustedPremium: data.adjusted_premium,
      basePremium: data.base_premium ?? basePremium,
    };
  } catch {
    const mult = 1;
    return {
      multiplier: mult,
      adjustedPremium: Math.round(basePremium * mult * 100) / 100,
      basePremium,
    };
  }
}

export async function fetchRiskScores(
  features: MlRiskFeatures
): Promise<{
  environmental: number;
  behavior: number;
  location: number;
  activity: number;
  trust: number;
  overall: number;
} | null> {
  const baseUrl = process.env.ML_SERVICE_URL ?? "http://localhost:8000";
  try {
    const { data } = await axios.post<{
      environmental: number;
      behavior: number;
      location: number;
      activity: number;
      trust: number;
      overall: number;
    }>(
      `${baseUrl}/risk-score`,
      { features, city_name: features.city_name },
      { timeout: 8000 }
    );
    return {
      environmental: data.environmental,
      behavior: data.behavior,
      location: data.location,
      activity: data.activity,
      trust: data.trust,
      overall: data.overall,
    };
  } catch {
    return null;
  }
}

export type FeatureImportanceRow = { feature: string; importance: number };

export async function fetchMlFeatureImportance(): Promise<{
  ordered: FeatureImportanceRow[];
} | null> {
  const baseUrl = process.env.ML_SERVICE_URL ?? "http://localhost:8000";
  try {
    const { data } = await axios.get<{
      ordered: FeatureImportanceRow[];
    }>(`${baseUrl}/feature-importance`, { timeout: 8000 });
    return data;
  } catch {
    return null;
  }
}

export async function triggerMlRetrain(): Promise<{
  mean_r2: number;
  std_r2: number;
  cv_scores: number[];
} | null> {
  const baseUrl = process.env.ML_SERVICE_URL ?? "http://localhost:8000";
  try {
    const { data } = await axios.post<{
      ok: boolean;
      mean_r2: number;
      std_r2: number;
      cv_scores: number[];
    }>(`${baseUrl}/retrain`, {}, { timeout: 120000 });
    return {
      mean_r2: data.mean_r2,
      std_r2: data.std_r2,
      cv_scores: data.cv_scores,
    };
  } catch {
    return null;
  }
}

/** Rule-based fallback when ML is down */
export function fallbackRiskScores(input: {
  envRisk: number;
  trustScore: number;
  orders: number;
}): {
  environmental: number;
  behavior: number;
  location: number;
  activity: number;
  trust: number;
  overall: number;
} {
  const environmental = Math.round(Math.min(100, input.envRisk));
  const behavior = Math.min(100, 40 + (input.orders > 20 ? 30 : 15));
  const location = 55;
  const activity = Math.min(100, 30 + Math.min(70, input.orders * 2));
  const trust = input.trustScore;
  const overall = Math.round(
    (environmental + behavior + location + activity + trust) / 5
  );
  return { environmental, behavior, location, activity, trust, overall };
}
