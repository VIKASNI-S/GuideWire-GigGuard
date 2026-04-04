import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireDb } from "../db/index";
import { policies, plans, users } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { subscribeSchema } from "../validation/schemas";
import {
  predictPremiumMultiplier,
  buildMlFeaturesFromUser,
} from "../services/mlService";
import { fetchWeatherForCoords } from "../services/weatherService";
import { fetchTrafficForCoords } from "../services/trafficService";

const router = Router();
router.use(authMiddleware);

router.get("/plans", async (_req: Request, res: Response) => {
  const db = requireDb();
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.isActive, true));
  res.json({ plans: rows });
});

router.get("/current", async (req: Request, res: Response) => {
  const db = requireDb();
  const [row] = await db
    .select({
      policy: policies,
      plan: plans,
    })
    .from(policies)
    .innerJoin(plans, eq(policies.planId, plans.id))
    .where(and(eq(policies.userId, req.userId!), eq(policies.status, "active")))
    .orderBy(desc(policies.createdAt))
    .limit(1);

  if (!row || row.policy.status !== "active") {
    res.json({ policy: null, plan: null });
    return;
  }

  res.json({
    policy: row.policy,
    plan: row.plan,
  });
});

router.post(
  "/subscribe",
  validateBody(subscribeSchema),
  async (req: Request, res: Response) => {
    const body = (req as Request & { validatedBody: z.infer<typeof subscribeSchema> })
      .validatedBody;
    const db = requireDb();

    const [existing] = await db
      .select()
      .from(policies)
      .where(
        and(eq(policies.userId, req.userId!), eq(policies.status, "active"))
      )
      .limit(1);

    if (existing) {
      res.status(400).json({ error: "You already have an active policy" });
      return;
    }

    const [planRow] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, body.planId))
      .limit(1);

    if (!planRow) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!u) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const base = parseFloat(String(planRow.weeklyPremium));

    const lat = u.latitude ? parseFloat(String(u.latitude)) : 13.0827;
    const lon = u.longitude ? parseFloat(String(u.longitude)) : 80.2707;
    let temperature = 32;
    let aqi = 140;
    let rain1h = 2;
    let trafficCongestion = 0.4;
    try {
      const [w, t] = await Promise.all([
        fetchWeatherForCoords(lat, lon),
        fetchTrafficForCoords(lat, lon),
      ]);
      temperature = w.temperatureC;
      aqi = w.aqi;
      rain1h = w.rainfallMmLastHour;
      trafficCongestion = t.congestionRatio;
    } catch {
      /* use defaults */
    }

    const mlFeatures = buildMlFeaturesFromUser(
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
        rainfall30Approx: rain1h * 10,
        temperature,
        aqi,
      }
    );

    const ml = await predictPremiumMultiplier(mlFeatures, base);

    const adjusted = ml.adjustedPremium;

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const [pol] = await db
      .insert(policies)
      .values({
        userId: req.userId!,
        planId: planRow.id,
        status: "active",
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        weeklyPremium: String(base),
        adjustedPremium: String(adjusted),
        riskScore: 50,
      })
      .returning();

    res.status(201).json({ policy: pol });
  }
);

router.delete("/cancel", async (req: Request, res: Response) => {
  const db = requireDb();
  await db
    .update(policies)
    .set({ status: "cancelled" })
    .where(
      and(eq(policies.userId, req.userId!), eq(policies.status, "active"))
    );
  res.json({ ok: true });
});

export default router;
