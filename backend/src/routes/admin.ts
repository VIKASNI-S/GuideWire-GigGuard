import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { requireDb } from "../db/index";
import {
  adminActions,
  admins,
  fraudAlerts,
  fraudEvents,
  locationPings,
  payouts,
  plans,
  policies,
  riskAssessments,
  triggerEvents,
  users,
} from "../db/schema";
import { requireAdminAuth } from "../middleware/adminAuth";

const router = Router();

function asNum(v: unknown): number {
  return Number(v ?? 0);
}

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const db = requireDb();
  const normalized = email.trim().toLowerCase();
  const [a] = await db.select().from(admins).where(eq(admins.email, normalized)).limit(1);
  if (!a) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(password, a.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }
  const token = jwt.sign(
    { sub: a.id, email: a.email, role: a.role ?? "admin", type: "admin" },
    secret,
    { expiresIn: "7d" }
  );
  res.json({
    token,
    admin: { id: a.id, email: a.email, name: a.name, role: a.role ?? "admin" },
  });
});

router.get("/auth/me", requireAdminAuth, async (req: Request, res: Response) => {
  const db = requireDb();
  const [a] = await db
    .select({ id: admins.id, email: admins.email, name: admins.name, role: admins.role })
    .from(admins)
    .where(eq(admins.id, req.adminId!))
    .limit(1);
  if (!a) {
    res.status(404).json({ error: "Admin not found" });
    return;
  }
  res.json({ admin: a });
});

router.use(requireAdminAuth);

router.get("/overview", async (_req: Request, res: Response) => {
  const db = requireDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [workersC] = await db.select({ c: sql<number>`count(*)::int` }).from(users);
  const [activePoliciesC] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(policies)
    .where(eq(policies.status, "active"));
  const [payoutsWeek] = await db
    .select({ total: sql<number>`coalesce(sum(${payouts.amount}::numeric),0)` })
    .from(payouts)
    .where(gte(payouts.createdAt, weekAgo));
  const [fraudWeek] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(triggerEvents)
    .where(and(eq(triggerEvents.isFraudFlagged, true), gte(triggerEvents.triggeredAt, weekAgo)));
  const [premiumWeek] = await db
    .select({ total: sql<number>`coalesce(sum(${policies.weeklyPremium}::numeric),0)` })
    .from(policies)
    .where(gte(policies.createdAt, weekAgo));

  const trend = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${payouts.createdAt}), 'YYYY-MM-DD')`,
      total: sql<number>`coalesce(sum(${payouts.amount}::numeric),0)`,
    })
    .from(payouts)
    .where(gte(payouts.createdAt, weekAgo))
    .groupBy(sql`date_trunc('day', ${payouts.createdAt})`)
    .orderBy(sql`date_trunc('day', ${payouts.createdAt})`);

  const triggerDist = await db
    .select({ triggerType: triggerEvents.triggerType, c: sql<number>`count(*)::int` })
    .from(triggerEvents)
    .where(gte(triggerEvents.triggeredAt, weekAgo))
    .groupBy(triggerEvents.triggerType);

  const payoutsVal = asNum(payoutsWeek?.total);
  const premiumVal = asNum(premiumWeek?.total);
  const lossRatio = premiumVal > 0 ? (payoutsVal / premiumVal) * 100 : 0;
  res.json({
    kpis: {
      totalActiveWorkers: asNum(workersC?.c),
      activePoliciesThisWeek: asNum(activePoliciesC?.c),
      totalPayoutsThisWeek: payoutsVal,
      fraudFlagsThisWeek: asNum(fraudWeek?.c),
    },
    lossRatio,
    lossRatioHealth: lossRatio < 60 ? "Healthy" : lossRatio <= 80 ? "Caution" : "Critical",
    payoutsTrend: trend,
    triggerDistribution: triggerDist,
  });
});

router.get("/workers", async (req: Request, res: Response) => {
  const db = requireDb();
  const q = String(req.query.q ?? "").trim();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
  const offset = (page - 1) * limit;

  const list = q
    ? await db
        .select()
        .from(users)
        .where(
          sql`${users.fullName} ILIKE ${`%${q}%`} OR ${users.email} ILIKE ${`%${q}%`} OR ${users.phone} ILIKE ${`%${q}%`}`
        )
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset)
    : await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);

  const ids = list.map((u) => u.id);
  const activePolicies = ids.length
    ? await db
        .select({ userId: policies.userId, planId: policies.planId })
        .from(policies)
        .where(and(inArray(policies.userId, ids), eq(policies.status, "active")))
    : [];
  const planIds = activePolicies.map((p) => p.planId!).filter(Boolean);
  const planRows = planIds.length
    ? await db.select({ id: plans.id, name: plans.name }).from(plans).where(inArray(plans.id, planIds))
    : [];
  const planMap = new Map(planRows.map((p) => [p.id, p.name]));
  const policyMap = new Map(activePolicies.map((p) => [p.userId, p.planId]));
  res.json({
    items: list.map((u) => ({
      ...u,
      planName: policyMap.get(u.id) ? planMap.get(policyMap.get(u.id)!) ?? "—" : "No plan",
      status: "Active",
    })),
    page,
    limit,
  });
});

router.get("/workers/:id", async (req: Request, res: Response) => {
  const db = requireDb();
  const workerId = String(req.params.id);
  const [u] = await db.select().from(users).where(eq(users.id, workerId)).limit(1);
  if (!u) {
    res.status(404).json({ error: "Worker not found" });
    return;
  }
  res.json({ worker: u });
});

router.get("/workers/:id/trust", async (req: Request, res: Response) => {
  const db = requireDb();
  const workerId = String(req.params.id);
  const [fraudCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(fraudEvents)
    .where(eq(fraudEvents.userId, workerId));
  const [approvedClaims] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(triggerEvents)
    .where(and(eq(triggerEvents.userId, workerId), eq(triggerEvents.isFraudFlagged, false)));
  const [totalClaims] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(triggerEvents)
    .where(eq(triggerEvents.userId, workerId));
  const [historyAge] = await db
    .select({ days: sql<number>`extract(day from now() - ${users.createdAt})::int` })
    .from(users)
    .where(eq(users.id, workerId))
    .limit(1);

  const total = Number(totalClaims?.c ?? 0);
  const passRate = total > 0 ? (Number(approvedClaims?.c ?? 0) / total) * 100 : 70;
  const locationConsistency = Math.max(0, 100 - Number(fraudCount?.c ?? 0) * 10);
  const claimLegitimacy = Math.max(0, Math.min(100, passRate));
  const activityConsistency = Math.min(100, 55 + Math.min(30, total * 3));
  const neighborSupport = Math.max(20, 90 - Number(fraudCount?.c ?? 0) * 8);
  const historyAgeScore = Math.min(100, 40 + Number(historyAge?.days ?? 0) / 4);
  const overall = Math.round(
    locationConsistency * 0.25 +
      claimLegitimacy * 0.3 +
      activityConsistency * 0.15 +
      neighborSupport * 0.15 +
      historyAgeScore * 0.15
  );

  res.json({
    trust: {
      overall,
      components: {
        locationConsistency: Math.round(locationConsistency),
        claimLegitimacy: Math.round(claimLegitimacy),
        activityConsistency: Math.round(activityConsistency),
        neighborSupport: Math.round(neighborSupport),
        historyAge: Math.round(historyAgeScore),
      },
      reasons: [
        `${Number(fraudCount?.c ?? 0)} fraud alerts found historically`,
        `${Math.round(passRate)}% claims passed fraud checks`,
      ],
    },
  });
});

router.get("/workers/:id/fraud-analysis", async (req: Request, res: Response) => {
  const db = requireDb();
  const workerId = String(req.params.id);
  const history = await db
    .select()
    .from(fraudEvents)
    .where(eq(fraudEvents.userId, workerId))
    .orderBy(desc(fraudEvents.createdAt))
    .limit(100);
  res.json({ items: history });
});

router.get("/workers/:id/location", async (req: Request, res: Response) => {
  const db = requireDb();
  const workerId = String(req.params.id);
  const rows = await db
    .select()
    .from(locationPings)
    .where(eq(locationPings.userId, workerId))
    .orderBy(desc(locationPings.recordedAt))
    .limit(200);
  res.json({ items: rows });
});

router.get("/workers/:id/payouts", async (req: Request, res: Response) => {
  const db = requireDb();
  const workerId = String(req.params.id);
  const rows = await db
    .select()
    .from(payouts)
    .where(eq(payouts.userId, workerId))
    .orderBy(desc(payouts.createdAt))
    .limit(200);
  res.json({ items: rows });
});

router.post("/workers/:id/suspend", async (req: Request, res: Response) => {
  const db = requireDb();
  const workerId = String(req.params.id);
  await db.insert(adminActions).values({
    adminId: req.adminId ?? null,
    actionType: "suspend_worker",
    targetUserId: workerId,
    details: { reason: (req.body as { reason?: string }).reason ?? "manual_suspend" },
  });
  res.json({ ok: true });
});

router.post("/workers/:id/trust", async (req: Request, res: Response) => {
  const db = requireDb();
  const workerId = String(req.params.id);
  const trustScore = Number((req.body as { trustScore?: number }).trustScore ?? 70);
  await db.update(users).set({ trustScore }).where(eq(users.id, workerId));
  await db.insert(adminActions).values({
    adminId: req.adminId ?? null,
    actionType: "adjust_trust",
    targetUserId: workerId,
    details: { trustScore },
  });
  res.json({ ok: true });
});

router.get("/fraud-alerts", async (req: Request, res: Response) => {
  const db = requireDb();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
  const offset = (page - 1) * limit;
  const type = String(req.query.type ?? "").trim();
  const severity = String(req.query.severity ?? "").trim();
  const resolution = String(req.query.resolution ?? "").trim();

  const whereParts: unknown[] = [];
  if (type) whereParts.push(eq(fraudEvents.fraudType, type));
  if (severity) whereParts.push(eq(fraudEvents.severity, severity));
  if (resolution) whereParts.push(eq(fraudEvents.resolution, resolution));
  const whereExpr = whereParts.length ? and(...(whereParts as Parameters<typeof and>)) : undefined;

  const legacyAlertsQuery = db
    .select({
      id: fraudAlerts.id,
      userId: fraudAlerts.userId,
      fraudType: fraudAlerts.alertType,
      severity: fraudAlerts.severity,
      confidenceScore: sql<number>`coalesce((${fraudAlerts.evidence} ->> 'confidence')::int, 70)`,
      evidence: fraudAlerts.evidence,
      clusterData: sql<Record<string, unknown> | null>`null`,
      resolution: fraudAlerts.status,
      createdAt: fraudAlerts.createdAt,
      workerName: users.fullName,
      workerCity: users.city,
      workerPlan: plans.name,
      triggerType: sql<string>`'unknown'`,
      triggerValue: sql<string | null>`null`,
      payoutAmount: sql<string | null>`null`,
    })
    .from(fraudAlerts)
    .leftJoin(users, eq(fraudAlerts.userId, users.id))
    .leftJoin(policies, and(eq(policies.userId, users.id), eq(policies.status, "active")))
    .leftJoin(plans, eq(policies.planId, plans.id))
    .orderBy(desc(fraudAlerts.createdAt))
    .limit(limit)
    .offset(offset);

  try {
    const baseAlertsQuery = db
      .select({
        id: fraudEvents.id,
        userId: fraudEvents.userId,
        fraudType: fraudEvents.fraudType,
        severity: fraudEvents.severity,
        confidenceScore: fraudEvents.confidenceScore,
        evidence: fraudEvents.evidence,
        clusterData: fraudEvents.clusterData,
        resolution: fraudEvents.resolution,
        createdAt: fraudEvents.createdAt,
        workerName: users.fullName,
        workerCity: users.city,
        workerPlan: plans.name,
        triggerType: triggerEvents.triggerType,
        triggerValue: triggerEvents.triggerValue,
        payoutAmount: payouts.amount,
      })
      .from(fraudEvents)
      .leftJoin(users, eq(fraudEvents.userId, users.id))
      .leftJoin(triggerEvents, eq(fraudEvents.triggerEventId, triggerEvents.id))
      .leftJoin(payouts, eq(triggerEvents.id, payouts.triggerEventId))
      .leftJoin(policies, eq(triggerEvents.policyId, policies.id))
      .leftJoin(plans, eq(policies.planId, plans.id));

    const alerts = whereExpr
      ? await baseAlertsQuery
          .where(whereExpr)
          .orderBy(desc(fraudEvents.createdAt))
          .limit(limit)
          .offset(offset)
      : await baseAlertsQuery
          .orderBy(desc(fraudEvents.createdAt))
          .limit(limit)
          .offset(offset);

    const normalizedAlerts = alerts.length > 0 ? alerts : await legacyAlertsQuery;

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        gps_spoofing: sql<number>`sum(case when ${fraudEvents.fraudType}='GPS_SPOOFING' then 1 else 0 end)::int`,
        neighbor_mismatch: sql<number>`sum(case when ${fraudEvents.fraudType}='NEIGHBOR_MISMATCH' then 1 else 0 end)::int`,
        behavior_anomaly: sql<number>`sum(case when ${fraudEvents.fraudType}='BEHAVIOR_ANOMALY' then 1 else 0 end)::int`,
        amountHeld: sql<number>`coalesce(sum(case when ${payouts.status}='fraud_held' then ${payouts.amount}::numeric else 0 end),0)`,
      })
      .from(fraudEvents)
      .leftJoin(triggerEvents, eq(fraudEvents.triggerEventId, triggerEvents.id))
      .leftJoin(payouts, eq(triggerEvents.id, payouts.triggerEventId));

    res.json({ alerts: normalizedAlerts, stats, page, limit });
  } catch (err) {
    const legacyAlerts = await legacyAlertsQuery;
    const [legacyStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        gps_spoofing: sql<number>`sum(case when ${fraudAlerts.alertType}='GPS_SPOOFING' then 1 else 0 end)::int`,
        neighbor_mismatch: sql<number>`sum(case when ${fraudAlerts.alertType}='NEIGHBOR_MISMATCH' then 1 else 0 end)::int`,
        behavior_anomaly: sql<number>`sum(case when ${fraudAlerts.alertType}='BEHAVIOR_ANOMALY' then 1 else 0 end)::int`,
      })
      .from(fraudAlerts);
    console.warn("[admin/fraud-alerts] falling back to legacy fraud_alerts table", err);
    res.json({
      alerts: legacyAlerts,
      stats: { ...legacyStats, amountHeld: 0 },
      page,
      limit,
    });
  }
});

router.post("/fraud-alerts/:id/approve", async (req: Request, res: Response) => {
  const db = requireDb();
  const alertId = String(req.params.id);
  const [alert] = await db
    .select({ triggerEventId: fraudEvents.triggerEventId })
    .from(fraudEvents)
    .where(eq(fraudEvents.id, alertId))
    .limit(1);
  if (alert?.triggerEventId) {
    await db
      .update(payouts)
      .set({ status: "credited", creditedAt: new Date(), transactionId: `ADM-${Date.now()}` })
      .where(eq(payouts.triggerEventId, alert.triggerEventId));
  }
  await db
    .update(fraudEvents)
    .set({ resolution: "approved", resolvedBy: req.adminId ?? null, resolvedAt: new Date() })
    .where(eq(fraudEvents.id, alertId));
  res.json({ ok: true });
});

router.post("/fraud-alerts/:id/reject", async (req: Request, res: Response) => {
  const db = requireDb();
  const alertId = String(req.params.id);
  const [alert] = await db
    .select({ triggerEventId: fraudEvents.triggerEventId })
    .from(fraudEvents)
    .where(eq(fraudEvents.id, alertId))
    .limit(1);
  if (alert?.triggerEventId) {
    await db
      .update(payouts)
      .set({ status: "failed", transactionId: null })
      .where(eq(payouts.triggerEventId, alert.triggerEventId));
  }
  await db
    .update(fraudEvents)
    .set({ resolution: "rejected", resolvedBy: req.adminId ?? null, resolvedAt: new Date() })
    .where(eq(fraudEvents.id, alertId));
  res.json({ ok: true });
});

router.get("/payouts", async (_req: Request, res: Response) => {
  const db = requireDb();
  const rows = await db.select().from(payouts).orderBy(desc(payouts.createdAt)).limit(500);
  res.json({ items: rows });
});

router.get("/payouts/export", async (_req: Request, res: Response) => {
  const db = requireDb();
  const rows = await db.select().from(payouts).orderBy(desc(payouts.createdAt)).limit(5000);
  const lines = [
    "id,user_id,policy_id,amount,status,payment_method,transaction_id,created_at",
    ...rows.map(
      (r) =>
        `${r.id},${r.userId ?? ""},${r.policyId ?? ""},${r.amount},${r.status ?? ""},${r.paymentMethod ?? ""},${r.transactionId ?? ""},${r.createdAt?.toISOString() ?? ""}`
    ),
  ];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=phoeraksha-payouts.csv");
  res.send(lines.join("\n"));
});

router.get("/analytics", async (_req: Request, res: Response) => {
  const db = requireDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const payoutByTrigger = await db
    .select({
      trigger: triggerEvents.triggerType,
      count: sql<number>`count(*)::int`,
      amount: sql<number>`coalesce(sum(${payouts.amount}::numeric),0)`,
    })
    .from(triggerEvents)
    .leftJoin(payouts, eq(triggerEvents.id, payouts.triggerEventId))
    .where(gte(triggerEvents.triggeredAt, weekAgo))
    .groupBy(triggerEvents.triggerType);
  res.json({ payoutByTrigger, hourlyPattern: [], cityRisk: [], premiumVsPayoutByPlan: [], trustDistribution: [], modelAccuracy: [] });
});

router.get("/live-map", async (_req: Request, res: Response) => {
  const db = requireDb();
  const workersRaw = await db
    .select({
      id: users.id,
      name: users.fullName,
      latitude: users.latitude,
      longitude: users.longitude,
      planName: plans.name,
      riskScore: riskAssessments.overallRiskScore,
    })
    .from(users)
    .leftJoin(policies, and(eq(policies.userId, users.id), eq(policies.status, "active")))
    .leftJoin(plans, eq(policies.planId, plans.id))
    .leftJoin(riskAssessments, eq(riskAssessments.userId, users.id))
    .where(sql`${users.latitude} IS NOT NULL AND ${users.longitude} IS NOT NULL`)
    .limit(2000);
  const workerIds = workersRaw.map((w) => w.id);
  const fraudByUser = workerIds.length
    ? await db
        .select({ userId: fraudEvents.userId, c: sql<number>`count(*)::int` })
        .from(fraudEvents)
        .where(inArray(fraudEvents.userId, workerIds))
        .groupBy(fraudEvents.userId)
    : [];
  const fraudMap = new Map(fraudByUser.map((f) => [f.userId, Number(f.c ?? 0)]));
  const workers = workersRaw.map((w) => {
    const riskLevel = Number(w.riskScore ?? 50);
    const fraudFlags = fraudMap.get(w.id) ?? 0;
    return {
      ...w,
      riskLevel,
      fraudFlags,
      lastPayoutAt: null,
    };
  });
  res.json({ workers });
});

router.get("/prediction", async (_req: Request, res: Response) => {
  res.json({
    cities: [
      { city: "Chennai", level: "high", potentialClaims: 847, estimatedPayout: 423500 },
      { city: "Bangalore", level: "medium", potentialClaims: 412, estimatedPayout: 168000 },
      { city: "Mumbai", level: "medium", potentialClaims: 390, estimatedPayout: 155000 },
    ],
    summary: "Chennai — HIGH risk week predicted. Est. 847 potential claims. Est. payout: ₹4,23,500",
  });
});

export default router;