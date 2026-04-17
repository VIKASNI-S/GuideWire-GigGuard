import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  text,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  deliveryCategory: varchar("delivery_category", { length: 50 }).notNull(),
  workerIdPlatform: varchar("worker_id_platform", { length: 100 }),
  yearsExperience: integer("years_experience").default(0),
  avgDailyOrders: integer("avg_daily_orders").default(0),
  avgWeeklyIncome: numeric("avg_weekly_income", { precision: 10, scale: 2 }).default(
    "0"
  ),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  vehicleType: varchar("vehicle_type", { length: 50 }),
  aadhaarLast4: varchar("aadhaar_last4", { length: 4 }),
  bankAccountNumber: varchar("bank_account_number", { length: 20 }),
  upiId: varchar("upi_id", { length: 100 }),
  trustScore: integer("trust_score").default(70),
  isVerified: boolean("is_verified").default(false),
  dateOfBirth: date("date_of_birth"),
  workingHoursPerDay: numeric("working_hours_per_day", {
    precision: 5,
    scale: 2,
  }),
  preferredPayoutMethod: varchar("preferred_payout_method", { length: 50 }),
  signupIp: varchar("signup_ip", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  weeklyPremium: numeric("weekly_premium", { precision: 8, scale: 2 }).notNull(),
  rainfallTriggerMm: numeric("rainfall_trigger_mm", {
    precision: 5,
    scale: 1,
  }).notNull(),
  payoutAmount: numeric("payout_amount", { precision: 10, scale: 2 }).notNull(),
  heatTriggerCelsius: numeric("heat_trigger_celsius", { precision: 5, scale: 1 }),
  aqiTrigger: integer("aqi_trigger"),
  trafficCongestionTrigger: numeric("traffic_congestion_trigger", {
    precision: 3,
    scale: 2,
  }),
  features: jsonb("features"),
  isActive: boolean("is_active").default(true),
});

export const policies = pgTable("policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id),
  status: varchar("status", { length: 20 }).default("active"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  weeklyPremium: numeric("weekly_premium", { precision: 8, scale: 2 }).notNull(),
  adjustedPremium: numeric("adjusted_premium", { precision: 8, scale: 2 }),
  riskScore: integer("risk_score").default(50),
  lastPayoutAt: timestamp("last_payout_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const triggerEvents = pgTable("trigger_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  policyId: uuid("policy_id").references(() => policies.id),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  triggerValue: numeric("trigger_value", { precision: 10, scale: 2 }),
  thresholdValue: numeric("threshold_value", { precision: 10, scale: 2 }),
  city: varchar("city", { length: 100 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  weatherData: jsonb("weather_data"),
  trafficData: jsonb("traffic_data"),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).defaultNow(),
  isFraudFlagged: boolean("is_fraud_flagged").default(false),
  fraudReason: text("fraud_reason"),
  activityDrop: boolean("activity_drop").default(false),
  activityValue: numeric("activity_value", { precision: 5, scale: 2 }),
});

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  policyId: uuid("policy_id").references(() => policies.id),
  triggerEventId: uuid("trigger_event_id").references(() => triggerEvents.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("processing"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  transactionId: varchar("transaction_id", { length: 100 }),
  creditedAt: timestamp("credited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const riskAssessments = pgTable("risk_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  environmentalScore: integer("environmental_score"),
  behaviorScore: integer("behavior_score"),
  locationScore: integer("location_score"),
  activityScore: integer("activity_score"),
  trustScore: integer("trust_score"),
  overallRiskScore: integer("overall_risk_score"),
  mlRecommendedPremium: numeric("ml_recommended_premium", {
    precision: 8,
    scale: 2,
  }),
  assessedAt: timestamp("assessed_at", { withTimezone: true }).defaultNow(),
});

export const payoutHistory = pgTable("payout_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  reason: varchar("reason", { length: 200 }),
  status: varchar("status", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const locationPings = pgTable(
  "location_pings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    accuracyMeters: integer("accuracy_meters"),
    source: varchar("source", { length: 20 }).default("browser"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_location_pings_user_time").on(t.userId, t.recordedAt),
    index("idx_location_pings_coords").on(t.latitude, t.longitude),
  ]
);

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const fraudAlerts = pgTable("fraud_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("medium"),
  description: text("description"),
  evidence: jsonb("evidence"),
  status: varchar("status", { length: 20 }).default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => admins.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const fraudEvents = pgTable("fraud_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  triggerEventId: uuid("trigger_event_id").references(() => triggerEvents.id),
  userId: uuid("user_id").references(() => users.id),
  fraudType: varchar("fraud_type", { length: 50 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("medium"),
  confidenceScore: integer("confidence_score").default(0),
  evidence: jsonb("evidence").notNull(),
  clusterData: jsonb("cluster_data"),
  resolution: varchar("resolution", { length: 20 }).default("pending"),
  resolvedBy: uuid("resolved_by").references(() => admins.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const adminActions = pgTable("admin_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").references(() => admins.id),
  actionType: varchar("action_type", { length: 50 }),
  targetUserId: uuid("target_user_id").references(() => users.id),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const trustScoreHistory = pgTable("trust_score_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  prevScore: integer("prev_score"),
  currentScore: integer("current_score"),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  policies: many(policies),
  payouts: many(payouts),
}));

export const policiesRelations = relations(policies, ({ one }) => ({
  user: one(users, {
    fields: [policies.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [policies.planId],
    references: [plans.id],
  }),
}));

