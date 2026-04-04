import "dotenv/config";
import { requireDb } from "./index";
import { plans } from "./schema";

async function seed(): Promise<void> {
  const db = requireDb();

  const existing = await db.select({ id: plans.id }).from(plans).limit(1);
  if (existing.length > 0) {
    console.log("Plans already seeded, skipping.");
    return;
  }

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

  console.log("Seeded plans: Basic, Standard, Premium");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
