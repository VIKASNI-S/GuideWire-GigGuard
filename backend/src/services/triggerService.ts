import { eq, and, desc, gte } from "drizzle-orm";
import type { DbClient } from "../db/index";
import {
  policies,
  plans,
  users,
  triggerEvents,
  payouts,
  payoutHistory,
} from "../db/schema";
import { fetchWeatherForCoords, fetchWeatherTriangulation } from "./weatherService";
import { fetchTrafficForCoords } from "./trafficService";
import { processPayment } from "./payoutService";
import {
  runFullFraudCheck,
  countPayoutsInPolicyWeek,
  lastPayoutAt,
} from "./fraudDetection";
import {
  buildWeatherState,
  getISTHour,
  isDemoModeEnv,
  pickTriggerDecision,
  type TriggerDecision,
} from "./triggerEvaluation";
import { isDemoModeActive as isMockDataDemoMode } from "./mockDataService";

export interface OverrideWeather {
  rainfallMm?: number;
  tempC?: number;
  aqi?: number;
  windKmh?: number;
}

export interface OverrideTraffic {
  congestion?: number;
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v));
}

function logTriggerConsole(decision: TriggerDecision, istHour: number): void {
  switch (decision.type) {
    case "heavy_rain":
      console.log(
        `[TRIGGER] Heavy rain: ${decision.value}mm > ${decision.threshold}mm threshold → FIRE`
      );
      break;
    case "extreme_heat":
      console.log(
        `[TRIGGER] Extreme heat: ${decision.value}°C > ${decision.threshold}°C → FIRE (IST hour ${istHour})`
      );
      break;
    case "high_wind":
      console.log(
        `[TRIGGER] High wind: ${decision.value}km/h > ${decision.threshold}km/h → FIRE`
      );
      break;
    case "poor_air_quality":
      console.log(
        `[TRIGGER] AQI crisis: ${decision.value} > ${decision.threshold} → FIRE`
      );
      break;
    case "traffic_jam":
      console.log(
        `[TRIGGER] Traffic jam: value=${decision.value} threshold=${decision.threshold} → FIRE`
      );
      break;
    default:
      break;
  }
}

export type RunPolicyResult = {
  ok: boolean;
  message: string;
  triggered?: boolean;
  triggerType?: string;
  amount?: number;
  reason?: string;
};

export async function runTriggerForPolicy(
  db: DbClient,
  policyId: string,
  options?: {
    overrideWeather?: OverrideWeather;
    overrideTraffic?: OverrideTraffic;
  }
): Promise<RunPolicyResult> {
  const [row] = await db
    .select({
      policy: policies,
      plan: plans,
      user: users,
    })
    .from(policies)
    .innerJoin(plans, eq(policies.planId, plans.id))
    .innerJoin(users, eq(policies.userId, users.id))
    .where(eq(policies.id, policyId))
    .limit(1);

  if (!row || row.policy.status !== "active") {
    return {
      ok: false,
      message: "Policy not active",
      triggered: false,
      reason: "inactive",
    };
  }

  const lat = row.user.latitude ? num(row.user.latitude) : 13.0827;
  const lon = row.user.longitude ? num(row.user.longitude) : 80.2707;

  const baseWeather = await fetchWeatherForCoords(lat, lon);
  let weather = baseWeather;
  if (options?.overrideWeather) {
    const o = options.overrideWeather;
    weather = {
      ...baseWeather,
      rainfallMmLastHour: o.rainfallMm ?? baseWeather.rainfallMmLastHour,
      temperatureC: o.tempC ?? baseWeather.temperatureC,
      aqi: o.aqi ?? baseWeather.aqi,
      windSpeedKmh: o.windKmh ?? baseWeather.windSpeedKmh,
    };
  }

  const baseTraffic = await fetchTrafficForCoords(lat, lon);
  let traffic = baseTraffic;
  if (options?.overrideTraffic) {
    traffic = {
      ...baseTraffic,
      congestionRatio:
        options.overrideTraffic.congestion ?? baseTraffic.congestionRatio,
    };
  }

  const demo = isDemoModeEnv() || isMockDataDemoMode();
  const wState = buildWeatherState(weather, traffic);
  const istHour = getISTHour();

  const trigger = pickTriggerDecision(wState, row.plan, demo);
  if (!trigger) {
    return {
      ok: true,
      message: "No trigger conditions met",
      triggered: false,
      reason: "no_match",
    };
  }

  logTriggerConsole(trigger, istHour);

  const dupWindowMs = isMockDataDemoMode()
    ? 30 * 60 * 1000
    : 6 * 60 * 60 * 1000;
  const dupSince = new Date(Date.now() - dupWindowMs);
  const dupEv = await db
    .select({ id: triggerEvents.id })
    .from(triggerEvents)
    .where(
      and(
        eq(triggerEvents.userId, row.user.id),
        eq(triggerEvents.triggerType, trigger.type),
        gte(triggerEvents.triggeredAt, dupSince)
      )
    )
    .limit(1);
  if (dupEv.length > 0) {
    return {
      ok: true,
      message: isMockDataDemoMode()
        ? "Same trigger type within 30 minutes — skipped"
        : "Same trigger type within 6 hours — skipped",
      triggered: false,
      reason: "duplicate_trigger_cooldown",
    };
  }

  const weekStart = new Date(row.policy.startDate);
  const weekEnd = new Date(row.policy.endDate);
  weekEnd.setHours(23, 59, 59, 999);

  const payoutsThisWeek = await countPayoutsInPolicyWeek(
    db,
    policyId,
    weekStart,
    weekEnd
  );
  if (payoutsThisWeek >= 3) {
    console.log(
      `[${new Date().toISOString()}] Max weekly payouts reached policy=${policyId}`
    );
    return {
      ok: false,
      message: "Max 3 payouts per policy per week",
      triggered: false,
      reason: "max_weekly",
    };
  }

  const payoutCooldownMs = isMockDataDemoMode()
    ? 30 * 60 * 1000
    : 6 * 60 * 60 * 1000;
  const lastAt = await lastPayoutAt(db, policyId);
  if (lastAt && Date.now() - lastAt.getTime() < payoutCooldownMs) {
    return {
      ok: false,
      message: isMockDataDemoMode()
        ? "30-minute payout cooldown active"
        : "6-hour payout window active",
      triggered: false,
      reason: "payout_cooldown",
    };
  }

  const triangulation =
    isMockDataDemoMode() || options?.overrideWeather
      ? [wState.rainfall, wState.rainfall, wState.rainfall]
      : await fetchWeatherTriangulation(lat, lon);
  void triangulation;

  const basePayout = num(row.plan.payoutAmount);
  const payoutAmount =
    Math.round(basePayout * trigger.payoutFraction * 100) / 100;
  const method = row.user.preferredPayoutMethod ?? "upi";

  const [ev] = await db
    .insert(triggerEvents)
    .values({
      userId: row.user.id,
      policyId,
      triggerType: trigger.type,
      triggerValue: String(trigger.value),
      thresholdValue: String(trigger.threshold),
      city: row.user.city,
      latitude: String(lat),
      longitude: String(lon),
      weatherData: weather as unknown as Record<string, unknown>,
      trafficData: traffic as unknown as Record<string, unknown>,
      isFraudFlagged: false,
      fraudReason: null,
    })
    .returning({ id: triggerEvents.id });

  const fraudResult = await runFullFraudCheck(db, {
    userId: row.user.id,
    triggerType: trigger.type,
    triggerValue: trigger.value,
    lat,
    lon,
    triggerEventId: ev.id,
  });

  if (!fraudResult.approved) {
    await db
      .update(triggerEvents)
      .set({
        isFraudFlagged: true,
        fraudReason: `${fraudResult.fraudType}: ${fraudResult.reason ?? "under review"}`,
      })
      .where(eq(triggerEvents.id, ev.id));

    await db.insert(payouts).values({
      userId: row.user.id,
      policyId,
      triggerEventId: ev.id,
      amount: String(payoutAmount),
      status: "fraud_held",
      paymentMethod: method,
      transactionId: null,
      creditedAt: null,
    });
    await db.insert(payoutHistory).values({
      userId: row.user.id,
      amount: String(payoutAmount),
      reason: `Trigger: ${trigger.type} — ${fraudResult.fraudType} review`,
      status: "Under Review",
    });
    return {
      ok: true,
      message: "Fraud checks flagged — under review",
      triggered: false,
      reason: `fraud_${fraudResult.fraudType?.toLowerCase() ?? "check"}`,
      amount: payoutAmount,
      triggerType: trigger.type,
    };
  }

  const [payoutRow] = await db
    .insert(payouts)
    .values({
      userId: row.user.id,
      policyId,
      triggerEventId: ev.id,
      amount: String(payoutAmount),
      status: "processing",
      paymentMethod: method,
    })
    .returning({ id: payouts.id });

  const pay = await processPayment(row.user.id, payoutAmount, method);

  if (pay.success) {
    await db
      .update(payouts)
      .set({
        status: "credited",
        transactionId: pay.transactionId,
        creditedAt: pay.creditedAt,
      })
      .where(eq(payouts.id, payoutRow.id));

    await db
      .update(policies)
      .set({ lastPayoutAt: pay.creditedAt })
      .where(eq(policies.id, policyId));

    await db.insert(payoutHistory).values({
      userId: row.user.id,
      amount: String(payoutAmount),
      reason: `Auto: ${trigger.type}`,
      status: "credited",
    });
  } else {
    await db
      .update(payouts)
      .set({ status: "failed", transactionId: pay.transactionId })
      .where(eq(payouts.id, payoutRow.id));
  }

  console.log(
    `[PAYOUT] user=${row.user.id} amount=₹${payoutAmount} type=${trigger.type} txn=${pay.transactionId}`
  );

  if (pay.success) {
    return {
      ok: true,
      message: "Payout credited",
      triggered: true,
      triggerType: trigger.type,
      amount: payoutAmount,
    };
  }
  return {
    ok: true,
    message: "Payout failed",
    triggered: true,
    triggerType: trigger.type,
    amount: payoutAmount,
    reason: "payment_failed",
  };
}

export async function runAllActivePolicies(db: DbClient): Promise<void> {
  const rows = await db
    .select({ id: policies.id })
    .from(policies)
    .where(eq(policies.status, "active"));

  for (const r of rows) {
    try {
      await runTriggerForPolicy(db, r.id);
    } catch (e) {
      console.error(
        `[${new Date().toISOString()}] Cron policy error`,
        r.id,
        e
      );
    }
  }
}

export async function runTriggerForUser(
  db: DbClient,
  userId: string
): Promise<RunPolicyResult> {
  const [p] = await db
    .select({ id: policies.id })
    .from(policies)
    .where(and(eq(policies.userId, userId), eq(policies.status, "active")))
    .orderBy(desc(policies.createdAt))
    .limit(1);

  if (!p) {
    return {
      ok: false,
      message: "No active policy",
      triggered: false,
      reason: "no_policy",
    };
  }
  return runTriggerForPolicy(db, p.id);
}

/** @deprecated Use runTriggerForUser */
export async function runTriggerForUserId(
  db: DbClient,
  userId: string
): Promise<RunPolicyResult> {
  return runTriggerForUser(db, userId);
}
