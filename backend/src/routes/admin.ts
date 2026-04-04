import { Router, type Request, type Response } from "express";
import { desc } from "drizzle-orm";
import { requireDb } from "../db/index";
import { triggerEvents, payouts } from "../db/schema";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/triggers", async (_req: Request, res: Response) => {
  const db = requireDb();
  const rows = await db
    .select()
    .from(triggerEvents)
    .orderBy(desc(triggerEvents.triggeredAt))
    .limit(100);
  res.json({ items: rows });
});

router.get("/payouts", async (_req: Request, res: Response) => {
  const db = requireDb();
  const rows = await db
    .select()
    .from(payouts)
    .orderBy(desc(payouts.createdAt))
    .limit(100);
  res.json({ items: rows });
});

export default router;
