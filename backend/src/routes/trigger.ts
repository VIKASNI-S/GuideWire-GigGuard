import { Router, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { requireDb } from "../db/index";
import { policies } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { runTriggerForPolicy } from "../services/triggerService";

const router = Router();
router.use(authMiddleware);

router.post("/manual-check", async (req: Request, res: Response) => {
  const db = requireDb();
  const targetUserId = req.userId!;

  const [p] = await db
    .select({ id: policies.id })
    .from(policies)
    .where(
      and(eq(policies.userId, targetUserId), eq(policies.status, "active"))
    )
    .orderBy(desc(policies.createdAt))
    .limit(1);

  if (!p) {
    res.status(400).json({ error: "No active policy for user" });
    return;
  }

  const result = await runTriggerForPolicy(db, p.id);
  res.json(result);
});

export default router;
