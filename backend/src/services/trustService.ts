import { eq } from "drizzle-orm";
import type { DbClient } from "../db/index";
import { users, trustScoreHistory } from "../db/schema";

/**
 * Updates a user's trust score and logs the change in history.
 * Rules:
 * - Fraud detected -> -20
 * - Suspicious / flagged -> -10
 * - Normal behavior -> +2
 * - Clean week -> +5
 * - Always clamped between 0 and 100.
 */
export async function updateTrustScore(
  db: DbClient,
  userId: string,
  change: number,
  reason: string
) {
  const [u] = await db
    .select({ trustScore: users.trustScore })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u) {
    console.error(`[TRUST] User ${userId} not found for trust update`);
    return null;
  }

  const prevScore = u.trustScore ?? 70;
  let newScore = prevScore + change;

  // Constraints: Clamped between 0 and 100
  if (newScore > 100) newScore = 100;
  if (newScore < 0) newScore = 0;

  // Update user score
  await db
    .update(users)
    .set({ trustScore: newScore })
    .where(eq(users.id, userId));

  // Log history
  await db.insert(trustScoreHistory).values({
    userId,
    prevScore,
    currentScore: newScore,
    reason,
  });

  console.log(
    `[TRUST] User ${userId} score updated: ${prevScore} -> ${newScore} (Reason: ${reason})`
  );

  return newScore;
}
