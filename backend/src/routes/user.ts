import { Router, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireDb } from "../db/index";
import { fraudAlerts, locationPings, users, riskAssessments } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { detectGpsSpoofing } from "../services/fraudDetection";

const router = Router();

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const locationPingSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyMeters: z.number().int().nonnegative().optional(),
  accuracy: z.number().int().nonnegative().optional(),
  source: z.enum(["browser", "mock", "manual"]).optional(),
});

router.use(authMiddleware);

router.get("/profile", async (req: Request, res: Response) => {
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
  const { passwordHash: _p, ...rest } = u;
  res.json({ profile: rest });
});

router.put(
  "/profile",
  validateBody(profileUpdateSchema),
  async (req: Request, res: Response) => {
    const body = (req as Request & { validatedBody: z.infer<typeof profileUpdateSchema> })
      .validatedBody;
    const db = requireDb();
    await db
      .update(users)
      .set({
        ...(body.fullName ? { fullName: body.fullName } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.city ? { city: body.city } : {}),
        ...(body.state ? { state: body.state } : {}),
        ...(body.latitude !== undefined
          ? { latitude: String(body.latitude) }
          : {}),
        ...(body.longitude !== undefined
          ? { longitude: String(body.longitude) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId!));

    res.json({ ok: true });
  }
);

router.get("/risk-assessment", async (req: Request, res: Response) => {
  const db = requireDb();
  const [r] = await db
    .select()
    .from(riskAssessments)
    .where(eq(riskAssessments.userId, req.userId!))
    .orderBy(desc(riskAssessments.assessedAt))
    .limit(1);

  res.json({ assessment: r ?? null });
});

router.post(
  "/location-ping",
  validateBody(locationPingSchema),
  async (req: Request, res: Response) => {
    const body = (req as Request & { validatedBody: z.infer<typeof locationPingSchema> })
      .validatedBody;
    const db = requireDb();
    const uid = req.userId!;

    const gps = await detectGpsSpoofing(db, uid, body.latitude, body.longitude);
    console.log(
      `[GPS CHECK] user=${uid} → isSpoofed=${gps.isSpoofed} reason="${
        gps.reason ?? "none"
      }" confidence=${gps.confidence}%`
    );

    await db.insert(locationPings).values({
      userId: uid,
      latitude: String(body.latitude),
      longitude: String(body.longitude),
      accuracyMeters: body.accuracyMeters ?? body.accuracy ?? null,
      source: body.source ?? "browser",
    });

    if (gps.isSpoofed) {
      await db.insert(fraudAlerts).values({
        userId: uid,
        alertType: "GPS_SPOOFING",
        severity: gps.confidence > 90 ? "critical" : "high",
        description: gps.reason ?? "GPS spoofing suspected",
        evidence: { confidence: gps.confidence, latitude: body.latitude, longitude: body.longitude },
        status: "pending",
      });
    }

    res.json({ ok: true, gps });
  }
);

export default router;
