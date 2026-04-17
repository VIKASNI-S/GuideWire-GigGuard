import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { requireDb } from "./index";
import { admins, plans } from "./schema";

async function seed(): Promise<void> {
  const db = requireDb();

  console.log("🌱 Seeding started...");

  // -----------------------------
  // ✅ Seed Plans (only if empty)
  // -----------------------------
  const existingPlans = await db.select({ id: plans.id }).from(plans).limit(1);

  if (existingPlans.length === 0) {
    await db.insert(plans).values([
      {
        name: "Basic",
        weeklyPremium: "30",
        rainfallTriggerMm: "60",
        payoutAmount: "200",
        heatTriggerCelsius: "44",
        aqiTrigger: 350,
        trafficCongestionTrigger: "0.85",
        features: {
          description: "Entry protection for light disruption days",
        },
        isActive: true,
      },
      {
        name: "Standard",
        weeklyPremium: "70",
        rainfallTriggerMm: "30",
        payoutAmount: "500",
        heatTriggerCelsius: "42",
        aqiTrigger: 300,
        trafficCongestionTrigger: "0.80",
        features: {
          description: "Balanced coverage for frequent riders",
          popular: true,
        },
        isActive: true,
      },
      {
        name: "Premium",
        weeklyPremium: "120",
        rainfallTriggerMm: "10",
        payoutAmount: "1000",
        heatTriggerCelsius: "40",
        aqiTrigger: 250,
        trafficCongestionTrigger: "0.75",
        features: {
          description: "Maximum sensitivity and highest payouts",
        },
        isActive: true,
      },
    ]);

    console.log("✅ Plans seeded");
  } else {
    console.log("ℹ️ Plans already exist, skipping...");
  }

  // -----------------------------
  // ✅ Seed Admin (ALWAYS check)
  // -----------------------------
  const existingAdmin = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, "admin@phoeraksha.com"))
    .limit(1);

  if (existingAdmin.length === 0) {
    console.log("👤 Creating admin...");

    const passwordHash = await bcrypt.hash("Admin@123", 12);

    await db.insert(admins).values({
      email: "admin@phoeraksha.com",
      passwordHash,
      name: "Phoeraksha Admin",
      role: "admin",
    });

    console.log("✅ Admin created: admin@phoeraksha.com");
  } else {
    console.log("ℹ️ Admin already exists, skipping...");
  }

  console.log("🎉 Seeding complete!");
}

// Run seed
seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  });