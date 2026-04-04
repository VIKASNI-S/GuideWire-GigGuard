import cron from "node-cron";
import { requireDb } from "../db/index";
import { runAllActivePolicies } from "../services/triggerService";

export function startAutoTriggerCron(): void {
  cron.schedule("*/10 * * * *", async () => {
    console.log(`[${new Date().toISOString()}] Auto-trigger cron tick`);
    try {
      const db = requireDb();
      await runAllActivePolicies(db);
    } catch (e) {
      console.error(`[${new Date().toISOString()}] Auto-trigger cron error`, e);
    }
  });
}
