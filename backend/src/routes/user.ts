import { Router, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireDb } from "../db/index";
import { users, riskAssessments } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
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

export default router;
