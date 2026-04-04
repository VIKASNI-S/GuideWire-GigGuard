import type { plans } from "../db/schema";

export type PlanRow = typeof plans.$inferSelect;

export type TriggerType =
  | "heavy_rain"
  | "extreme_heat"
  | "poor_air_quality"
  | "traffic_jam"
  | "high_wind";

export type WeatherState = {
  rainfall: number;
  temp: number;
  aqi: number;
  congestion: number;
  wind: number;
  roadClosure: boolean;
};

export type PlanThresholdPack = {
  rain: number;
  heat: number;
  aqi: number;
  congestion: number;
};

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v));
}

export function isDemoModeEnv(): boolean {
  return process.env.DEMO_MODE === "true";
}

function planTier(name: string): "basic" | "standard" | "premium" {
  const n = name.toLowerCase();
  if (n.includes("premium")) return "premium";
  if (n.includes("standard")) return "standard";
  return "basic";
}

/** Relaxed thresholds for judge / DEMO_MODE env (OpenWeather still real unless mock toggle). */
export function demoThresholdsForTier(
  tier: "basic" | "standard" | "premium"
): PlanThresholdPack {
  switch (tier) {
    case "basic":
      return { rain: 5, heat: 33, aqi: 100, congestion: 0.85 };
    case "standard":
      return { rain: 3, heat: 32, aqi: 80, congestion: 0.8 };
    case "premium":
      return { rain: 1, heat: 31, aqi: 60, congestion: 0.75 };
  }
}

export function prodThresholdsFromPlan(planRow: PlanRow): PlanThresholdPack {
  return {
    rain: num(planRow.rainfallTriggerMm),
    heat: num(planRow.heatTriggerCelsius),
    aqi: planRow.aqiTrigger ?? 300,
    congestion: num(planRow.trafficCongestionTrigger),
  };
}

export function getThresholdPack(planRow: PlanRow, demo: boolean): PlanThresholdPack {
  if (demo) return demoThresholdsForTier(planTier(planRow.name));
  return prodThresholdsFromPlan(planRow);
}

/** Wind km/h — tiered (demo vs prod). */
export function windThresholdForPlan(planRow: PlanRow, demo: boolean): number {
  const tier = planTier(planRow.name);
  if (demo) {
    if (tier === "basic") return 30;
    if (tier === "standard") return 25;
    return 20;
  }
  if (tier === "basic") return 70;
  if (tier === "standard") return 60;
  return 50;
}

/** @deprecated Use windThresholdForPlan when plan is known; keeps mid-tier for legacy callers */
export function windThreshold(demo: boolean): number {
  return demo ? 25 : 60;
}

export function poorAqiThreshold(demo: boolean): number {
  return demo ? 80 : 250;
}

export function peakCongestionMin(): number {
  return 0.2;
}

export function getISTHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value;
  return h ? parseInt(h, 10) : 0;
}

export function isPeakTrafficIST(hour: number): boolean {
  return (hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 21);
}

export type TriggerDecision = {
  type: TriggerType;
  value: number;
  threshold: number;
  payoutFraction: number;
};

/**
 * Single trigger for payout (first match in priority order).
 * Five types: heavy_rain, extreme_heat, poor_air_quality, traffic_jam, high_wind.
 */
export function pickTriggerDecision(
  w: WeatherState,
  planRow: PlanRow,
  demo: boolean,
  _now: Date = new Date()
): TriggerDecision | null {
  const t = getThresholdPack(planRow, demo);
  const windT = windThresholdForPlan(planRow, demo);

  if (w.rainfall > t.rain) {
    return {
      type: "heavy_rain",
      value: w.rainfall,
      threshold: t.rain,
      payoutFraction: 1,
    };
  }
  if (w.temp >= t.heat) {
    return {
      type: "extreme_heat",
      value: w.temp,
      threshold: t.heat,
      payoutFraction: 1,
    };
  }
  if (w.aqi > t.aqi) {
    return {
      type: "poor_air_quality",
      value: w.aqi,
      threshold: t.aqi,
      payoutFraction: 0.6,
    };
  }
  if (w.roadClosure || w.congestion > t.congestion) {
    return {
      type: "traffic_jam",
      value: w.roadClosure ? 1 : w.congestion,
      threshold: t.congestion,
      payoutFraction: 0.5,
    };
  }
  if (w.wind > windT) {
    return {
      type: "high_wind",
      value: w.wind,
      threshold: windT,
      payoutFraction: 0.4,
    };
  }
  return null;
}

/** All trigger types whose conditions are met (for dashboard / judge APIs). */
export function listTriggersThatWouldFire(
  w: WeatherState,
  planRow: PlanRow,
  demo: boolean,
  _now: Date = new Date()
): TriggerType[] {
  const t = getThresholdPack(planRow, demo);
  const windT = windThresholdForPlan(planRow, demo);

  const out: TriggerType[] = [];
  if (w.rainfall > t.rain) out.push("heavy_rain");
  if (w.temp >= t.heat) out.push("extreme_heat");
  if (w.aqi > t.aqi) out.push("poor_air_quality");
  if (w.roadClosure || w.congestion > t.congestion) out.push("traffic_jam");
  if (w.wind > windT) out.push("high_wind");
  return out;
}

export function buildWeatherState(
  weather: {
    rainfallMmLastHour: number;
    temperatureC: number;
    aqi: number;
    windSpeedKmh: number;
  },
  traffic: { congestionRatio: number; roadClosure?: boolean }
): WeatherState {
  return {
    rainfall: weather.rainfallMmLastHour,
    temp: weather.temperatureC,
    aqi: weather.aqi,
    congestion: traffic.congestionRatio,
    wind: weather.windSpeedKmh,
    roadClosure: Boolean(traffic.roadClosure),
  };
}
