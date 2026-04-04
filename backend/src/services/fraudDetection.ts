import type { DbClient } from "../db/index";
import { payouts, users } from "../db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { haversineKm } from "../utils/geo";

/** City + minute bucket for mass-claim detection */
const cityMinuteCounts = new Map<string, number>();

function minuteKey(city: string): string {
  const m = Math.floor(Date.now() / 60000);
  return `${city}|${m}`;
}

export function recordCityTrigger(city: string): number {
  const k = minuteKey(city);
  const n = (cityMinuteCounts.get(k) ?? 0) + 1;
  cityMinuteCounts.set(k, n);
  if (cityMinuteCounts.size > 500) {
    const cutoff = Math.floor(Date.now() / 60000) - 5;
    for (const key of cityMinuteCounts.keys()) {
      const parts = key.split("|");
      const bucket = Number(parts[parts.length - 1]);
      if (!Number.isNaN(bucket) && bucket < cutoff) {
        cityMinuteCounts.delete(key);
      }
    }
  }
  return n;
}

export interface FraudContext {
  userId: string;
  policyId: string;
  triggerType: string;
  city: string;
  userLat: number | null;
  userLon: number | null;
  claimedCityLat?: number;
  claimedCityLon?: number;
  rainfallTriangulation: number[];
  userRainfall: number;
  rainfallThreshold: number;
}

export interface FraudResult {
  flagged: boolean;
  reasons: string[];
  /** If mass event, client may delay */
  delayMinutes?: number;
}

export async function runFraudChecks(
  db: DbClient,
  ctx: FraudContext
): Promise<FraudResult> {
  const reasons: string[] = [];

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);

  if (u && u.trustScore !== null && u.trustScore < 40) {
    reasons.push("Trust score below 40 — payouts suspended for review");
  }

  if (
    ctx.userLat !== null &&
    ctx.userLon !== null &&
    ctx.claimedCityLat !== undefined &&
    ctx.claimedCityLon !== undefined
  ) {
    const d = haversineKm(
      ctx.userLat,
      ctx.userLon,
      ctx.claimedCityLat,
      ctx.claimedCityLon
    );
    if (d > 100) {
      reasons.push("GPS location inconsistent with claimed city (>100km)");
    }
  }

  const [low, mid, high] = ctx.rainfallTriangulation;
  if (
    ctx.userRainfall > ctx.rainfallThreshold &&
    low < ctx.rainfallThreshold * 0.3 &&
    mid < ctx.rainfallThreshold * 0.3 &&
    high < ctx.rainfallThreshold * 0.3
  ) {
    reasons.push("Weather anomaly vs nearby stations");
  }

  const last24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentPayoutCount = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(payouts)
    .where(
      and(eq(payouts.userId, ctx.userId), gte(payouts.createdAt, last24))
    );

  const cnt = Number(recentPayoutCount[0]?.c ?? 0);
  if (cnt >= 3) {
    reasons.push("Behavioral anomaly: high payout frequency in 24h");
  }

  const mass = recordCityTrigger(ctx.city);
  if (mass > 50) {
    reasons.push("Mass simultaneous claims in city — under review (2m delay)");
    return { flagged: true, reasons, delayMinutes: 2 };
  }

  return {
    flagged: reasons.length > 0,
    reasons,
  };
}

export async function countPayoutsInPolicyWeek(
  db: DbClient,
  policyId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(payouts)
    .where(
      and(
        eq(payouts.policyId, policyId),
        gte(payouts.createdAt, weekStart),
        lte(payouts.createdAt, weekEnd)
      )
    );
  return Number(rows[0]?.c ?? 0);
}

export async function lastPayoutAt(
  db: DbClient,
  policyId: string
): Promise<Date | null> {
  const rows = await db
    .select({ createdAt: payouts.createdAt })
    .from(payouts)
    .where(and(eq(payouts.policyId, policyId), eq(payouts.status, "credited")))
    .orderBy(desc(payouts.createdAt))
    .limit(1);
  const t = rows[0]?.createdAt;
  return t ? new Date(t) : null;
}
