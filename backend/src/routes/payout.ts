import { Router, type Request, type Response } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireDb } from "../db/index";
import { payouts, payoutHistory } from "../db/schema";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/history", async (req: Request, res: Response) => {
  const db = requireDb();
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(payoutHistory)
    .where(eq(payoutHistory.userId, req.userId!))
    .orderBy(desc(payoutHistory.createdAt))
    .limit(limit)
    .offset(offset);

  const countRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(payoutHistory)
    .where(eq(payoutHistory.userId, req.userId!));

  res.json({
    items: rows,
    page,
    limit,
    total: Number(countRows[0]?.c ?? 0),
  });
});

router.get("/stats", async (req: Request, res: Response) => {
  const db = requireDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const earned = await db
    .select({
      s: sql<string>`coalesce(sum(${payouts.amount}::numeric),0)`,
    })
    .from(payouts)
    .where(
      and(
        eq(payouts.userId, req.userId!),
        eq(payouts.status, "credited"),
        gte(payouts.createdAt, weekAgo)
      )
    );

  const triggers = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(payouts)
    .where(
      and(eq(payouts.userId, req.userId!), gte(payouts.createdAt, weekAgo))
    );

  res.json({
    totalEarnedWeek: parseFloat(String(earned[0]?.s ?? 0)),
    triggersThisWeek: Number(triggers[0]?.c ?? 0),
  });
});

export default router;
