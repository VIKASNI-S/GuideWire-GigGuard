/**
 * PHOERAKSHA FRAUD DETECTION SYSTEM
 *
 * Three-layer detection:
 * 1. GPS Spoofing — Haversine distance + impossible speed check
 * 2. Neighborhood Cluster — Do nearby workers corroborate this event?
 * 3. Behavioral Anomaly — Historical claim frequency analysis
 *
 * All fraud events stored in fraud_events table with full evidence JSONB.
 * Admin can review/approve/reject from /admin/fraud page.
 * Trust score calculated per-worker from fraud history (admin-only view).
 */

import type { DbClient } from "../db/index";
import { fraudEvents, locationPings, payouts, triggerEvents, users } from "../db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { haversineDistance, isWithinRadius } from "../utils/geo";

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
  neighborhoodLat?: number;
  neighborhoodLon?: number;
}

export interface FraudResult {
  flagged: boolean;
  reasons: string[];
  /** If mass event, client may delay */
  delayMinutes?: number;
}

export async function runFraudChecks(db: DbClient, ctx: FraudContext): Promise<FraudResult> {
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
    const d = haversineDistance(
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

  if (
    ctx.neighborhoodLat !== undefined &&
    ctx.neighborhoodLon !== undefined
  ) {
    const n = await calculateNeighborhoodScore(
      db,
      ctx.neighborhoodLat,
      ctx.neighborhoodLon,
      ctx.triggerType,
      new Date()
    );
    if (n.score < 30 && !["heavy_rain", "extreme_heat", "poor_air_quality"].includes(ctx.triggerType)) {
      reasons.push("NEIGHBOR_MISMATCH: No nearby users experienced same disruption");
      console.log(
        `[NEIGHBOR CHECK] user=${ctx.userId} → score=${n.score} nearby=${n.nearbyCount} → FLAGGED`
      );
    } else {
      console.log(
        `[NEIGHBOR CHECK] user=${ctx.userId} → score=${n.score} nearby=${n.nearbyCount} users corroborate event → OK`
      );
    }
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

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  chennai: { lat: 13.0827, lon: 80.2707 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  delhi: { lat: 28.6139, lon: 77.209 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  pune: { lat: 18.5204, lon: 73.8567 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
};

function cityCoords(name: string): { lat: number; lon: number } | null {
  const key = name.trim().toLowerCase();
  return CITY_COORDS[key] ?? null;
}

export async function detectGpsSpoofing(
  db: DbClient,
  userId: string,
  newLat: number,
  newLon: number
): Promise<{ isSpoofed: boolean; reason?: string; confidence: number }> {
  const recent = await db
    .select({
      latitude: locationPings.latitude,
      longitude: locationPings.longitude,
      recordedAt: locationPings.recordedAt,
    })
    .from(locationPings)
    .where(eq(locationPings.userId, userId))
    .orderBy(desc(locationPings.recordedAt))
    .limit(5);

  if (recent.length < 1) return { isSpoofed: false, confidence: 0 };

  const last = recent[0];
  const lastAt = last.recordedAt ? new Date(last.recordedAt) : null;
  if (lastAt) {
    const mins = Math.max(1 / 60, (Date.now() - lastAt.getTime()) / 60000);
    const prevLat = Number(last.latitude ?? 0);
    const prevLon = Number(last.longitude ?? 0);
    const distanceKm = haversineDistance(prevLat, prevLon, newLat, newLon);
    const maxDistanceKm = (mins / 60) * 60;
    if (distanceKm > maxDistanceKm + 1) {
      return {
        isSpoofed: true,
        reason: `Location jump: ${distanceKm.toFixed(1)}km in ${mins.toFixed(
          1
        )} min (max realistic: ${maxDistanceKm.toFixed(1)}km)`,
        confidence: Math.min(
          99,
          Math.round((distanceKm / Math.max(0.1, maxDistanceKm)) * 50)
        ),
      };
    }
  }

  const [u] = await db
    .select({ city: users.city })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const center = u?.city ? cityCoords(u.city) : null;
  if (center) {
    const dCity = haversineDistance(center.lat, center.lon, newLat, newLon);
    if (dCity > 80) {
      return {
        isSpoofed: true,
        reason: `Worker appears to be ${dCity.toFixed(0)}km from claimed city`,
        confidence: 85,
      };
    }
  }
  return { isSpoofed: false, confidence: 0 };
}

export async function calculateNeighborhoodScore(
  db: DbClient,
  lat: number,
  lon: number,
  triggerType: string,
  eventTime: Date
): Promise<{ score: number; nearbyCount: number; supportingCount: number }> {
  const start = new Date(eventTime.getTime() - 20 * 60 * 1000);
  const end = new Date(eventTime.getTime() + 5 * 60 * 1000);
  const events = await db
    .select({
      latitude: triggerEvents.latitude,
      longitude: triggerEvents.longitude,
    })
    .from(triggerEvents)
    .where(
      and(
        eq(triggerEvents.triggerType, triggerType),
        gte(triggerEvents.triggeredAt, start),
        lte(triggerEvents.triggeredAt, end),
        eq(triggerEvents.isFraudFlagged, false)
      )
    );

  let nearbyCount = 0;
  for (const e of events) {
    const elat = Number(e.latitude ?? 0);
    const elon = Number(e.longitude ?? 0);
    if (isWithinRadius(lat, lon, elat, elon, 2.0)) nearbyCount += 1;
  }

  const score =
    nearbyCount === 0 ? 20 : nearbyCount === 1 ? 50 : nearbyCount === 2 ? 75 : 95;
  return { score, nearbyCount, supportingCount: nearbyCount };
}

export async function checkBehaviorAnomaly(
  db: DbClient,
  userId: string,
  triggerType: string
): Promise<{ flagged: boolean; confidence: number; reason: string; evidence: Record<string, unknown> }> {
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const history = await db
    .select({ triggerType: triggerEvents.triggerType, triggeredAt: triggerEvents.triggeredAt })
    .from(triggerEvents)
    .where(and(eq(triggerEvents.userId, userId), gte(triggerEvents.triggeredAt, last30Days)));

  const totalClaims30Days = history.length;
  const thisTypeCount = history.filter((h) => h.triggerType === triggerType).length;
  const avgPerWeek = thisTypeCount / (30 / 7);

  if (avgPerWeek > 5) {
    return {
      flagged: true,
      confidence: Math.min(90, Math.round(avgPerWeek * 10)),
      reason: `Unusually high claim frequency: ${thisTypeCount} ${triggerType} claims in 30 days (${avgPerWeek.toFixed(1)}/week).`,
      evidence: { totalClaims30Days, thisTypeCount, avgPerWeek },
    };
  }

  const last3Hours = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const recentSameType = history.filter(
    (t) => t.triggerType === triggerType && t.triggeredAt && new Date(t.triggeredAt) > last3Hours
  );
  if (recentSameType.length > 0) {
    return {
      flagged: true,
      confidence: 75,
      reason: `Duplicate claim: ${triggerType} already triggered ${recentSameType.length} time(s) in last 3 hours.`,
      evidence: { recentSameType: recentSameType.length },
    };
  }

  return {
    flagged: false,
    confidence: 0,
    reason: "Claim frequency within normal range.",
    evidence: { totalClaims30Days, thisTypeCount, avgPerWeek },
  };
}

export async function runFullFraudCheck(
  db: DbClient,
  {
    userId,
    triggerType,
    triggerValue,
    lat,
    lon,
    triggerEventId,
  }: {
    userId: string;
    triggerType: string;
    triggerValue: number;
    lat: number;
    lon: number;
    triggerEventId: string;
  }
): Promise<{ approved: boolean; fraudType?: string; confidence?: number; reason?: string }> {
  const eventTime = new Date();
  const [gpsCheck, neighborCheck, behaviorCheck] = await Promise.all([
    detectGpsSpoofing(db, userId, lat, lon),
    calculateNeighborhoodScore(db, lat, lon, triggerType, eventTime),
    checkBehaviorAnomaly(db, userId, triggerType),
  ]);

  console.log(`[FRAUD CHECK] user=${userId} type=${triggerType}`);
  console.log(
    `  GPS: flagged=${gpsCheck.isSpoofed} confidence=${gpsCheck.confidence} reason="${gpsCheck.reason ?? "ok"}"`
  );
  console.log(
    `  NEIGHBOR: score=${neighborCheck.score} cluster=${neighborCheck.nearbyCount} nearby=${neighborCheck.supportingCount}`
  );
  console.log(
    `  BEHAVIOR: flagged=${behaviorCheck.flagged} confidence=${behaviorCheck.confidence} reason="${behaviorCheck.reason}"`
  );

  if (gpsCheck.isSpoofed && gpsCheck.confidence > 70) {
    await db.insert(fraudEvents).values({
      triggerEventId,
      userId,
      fraudType: "GPS_SPOOFING",
      severity: gpsCheck.confidence > 85 ? "critical" : "high",
      confidenceScore: gpsCheck.confidence,
      evidence: { reason: gpsCheck.reason, confidence: gpsCheck.confidence },
      clusterData: {
        neighborScore: neighborCheck.score,
        nearbyCount: neighborCheck.nearbyCount,
      },
    });
    return {
      approved: false,
      fraudType: "GPS_SPOOFING",
      confidence: gpsCheck.confidence,
      reason: gpsCheck.reason,
    };
  }

  const trafficLike = triggerType === "traffic_jam" || triggerType === "peak_hour_traffic";
  if (trafficLike && neighborCheck.score < 30) {
    const confidence = Math.max(60, 100 - neighborCheck.score);
    await db.insert(fraudEvents).values({
      triggerEventId,
      userId,
      fraudType: "NEIGHBOR_MISMATCH",
      severity: confidence > 80 ? "high" : "medium",
      confidenceScore: confidence,
      evidence: { triggerType, triggerValue, neighborScore: neighborCheck.score },
      clusterData: neighborCheck,
    });
    return {
      approved: false,
      fraudType: "NEIGHBOR_MISMATCH",
      confidence,
      reason: "No nearby workers corroborated this traffic event",
    };
  }

  if (behaviorCheck.flagged && behaviorCheck.confidence > 65) {
    await db.insert(fraudEvents).values({
      triggerEventId,
      userId,
      fraudType: "BEHAVIOR_ANOMALY",
      severity: "medium",
      confidenceScore: behaviorCheck.confidence,
      evidence: behaviorCheck.evidence,
    });
    return {
      approved: false,
      fraudType: "BEHAVIOR_ANOMALY",
      confidence: behaviorCheck.confidence,
      reason: behaviorCheck.reason,
    };
  }

  return { approved: true };
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
