import { z } from "zod";

const phoneIn = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number");

const passwordIn = z
  .string()
  .min(8, "Min 8 characters")
  .regex(/[A-Z]/, "Need one uppercase letter")
  .regex(/[0-9]/, "Need one number");

const upiIn = z
  .string()
  .regex(/^[\w.-]+@[\w.-]+$/, "UPI must look like name@bank");

export const signupSchema = z
  .object({
    fullName: z.string().min(2).max(100),
    email: z.string().email(),
    phone: phoneIn,
    password: passwordIn,
    city: z.string().min(1),
    state: z.string().min(1),
    dateOfBirth: z.string(),
    aadhaarLast4: z.string().regex(/^\d{4}$/, "Exactly 4 digits"),
    platform: z.string(),
    deliveryCategory: z.string(),
    workerIdPlatform: z.string().optional(),
    yearsExperience: z.coerce.number().min(0).max(50),
    vehicleType: z.string(),
    avgDailyOrders: z.coerce.number().min(0),
    avgWeeklyIncome: z.coerce.number().positive("Must be greater than 0"),
    workingHoursPerDay: z.coerce.number().min(0).max(24),
    upiId: upiIn,
    bankAccountNumber: z.string().optional(),
    preferredPayoutMethod: z.enum(["upi", "bank_transfer"]),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.platform.toLowerCase() !== "other" &&
      (!data.workerIdPlatform || data.workerIdPlatform.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Worker ID is required for selected platform",
        path: ["workerIdPlatform"],
      });
    }
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export const subscribeSchema = z.object({
  planId: z.string().uuid(),
});

export const manualTriggerSchema = z.object({
  userId: z.string().uuid().optional(),
});

export const demoSimulateSchema = z.object({
  userId: z.string().uuid().optional(),
  rainfallMm: z.number().optional(),
  tempC: z.number().optional(),
  aqi: z.number().optional(),
  congestion: z.number().optional(),
});
