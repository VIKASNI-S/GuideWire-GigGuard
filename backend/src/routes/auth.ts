import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { requireDb } from "../db/index";
import { users } from "../db/schema";
import { authMiddleware, AUTH_COOKIE_NAME } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { loginSchema, signupSchema } from "../validation/schemas";
import type { z } from "zod";

const router = Router();

function mapPlatform(p: string): string {
  const x = p.toLowerCase().replace(/\s+/g, "_");
  const allowed = [
    "zomato",
    "swiggy",
    "zepto",
    "blinkit",
    "amazon",
    "flipkart",
    "dunzo",
    "other",
  ];
  return allowed.includes(x) ? x : "other";
}

function mapCategory(p: string): string {
  const x = p.toLowerCase();
  if (x.includes("grocery") || x.includes("q-commerce")) return "grocery";
  if (x.includes("ecommerce") || x.includes("e-commerce")) return "ecommerce";
  return "food";
}

router.post(
  "/signup",
  validateBody(signupSchema),
  async (req: Request, res: Response): Promise<void> => {
    const body = (req as Request & { validatedBody: z.infer<typeof signupSchema> })
      .validatedBody;
    const db = requireDb();

    const exists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (exists.length) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const hash = await bcrypt.hash(body.password, 12);
    const platform = mapPlatform(body.platform);
    const deliveryCategory = mapCategory(body.deliveryCategory);

    const [created] = await db
      .insert(users)
      .values({
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        passwordHash: hash,
        platform,
        deliveryCategory,
        workerIdPlatform: body.workerIdPlatform ?? null,
        yearsExperience: body.yearsExperience,
        avgDailyOrders: body.avgDailyOrders,
        avgWeeklyIncome: String(body.avgWeeklyIncome),
        city: body.city,
        state: body.state,
        latitude:
          body.latitude !== undefined ? String(body.latitude) : null,
        longitude:
          body.longitude !== undefined ? String(body.longitude) : null,
        vehicleType: body.vehicleType.toLowerCase(),
        aadhaarLast4: body.aadhaarLast4,
        bankAccountNumber: body.bankAccountNumber ?? null,
        upiId: body.upiId,
        trustScore: 70,
        isVerified: false,
        dateOfBirth: body.dateOfBirth,
        workingHoursPerDay: String(body.workingHoursPerDay),
        preferredPayoutMethod: body.preferredPayoutMethod,
        signupIp: req.ip ?? null,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
      });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: "Server misconfiguration" });
      return;
    }

    const maxAge = 7 * 24 * 60 * 60;
    const token = jwt.sign(
      { sub: created.id, email: created.email },
      secret,
      { expiresIn: `${maxAge}s` }
    );

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAge * 1000,
    });

    res.status(201).json({
      user: {
        id: created.id,
        email: created.email,
        fullName: created.fullName,
      },
    });
  }
);

router.post(
  "/login",
  validateBody(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const body = (req as Request & { validatedBody: z.infer<typeof loginSchema> })
      .validatedBody;
    const db = requireDb();

    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (!u) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(body.password, u.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: "Server misconfiguration" });
      return;
    }

    const maxAgeSec = body.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    const token = jwt.sign({ sub: u.id, email: u.email }, secret, {
      expiresIn: `${maxAgeSec}s`,
    });

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAgeSec * 1000,
    });

    res.json({
      user: {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
      },
    });
  }
);

router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const db = requireDb();
  const [u] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      city: users.city,
      state: users.state,
      platform: users.platform,
      deliveryCategory: users.deliveryCategory,
      trustScore: users.trustScore,
    })
    .from(users)
    .where(eq(users.id, req.userId!))
    .limit(1);

  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: u });
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.json({ ok: true });
});

export default router;
