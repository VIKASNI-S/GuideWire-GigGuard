import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import policyRoutes from "./routes/policy";
import payoutRoutes from "./routes/payout";
import riskRoutes from "./routes/risk";
import adminRoutes from "./routes/admin";
import triggerRoutes from "./routes/trigger";
import demoRoutes from "./routes/demo";
import mlRoutes from "./routes/ml";
import mockRoutes from "./routes/mock";
import { startAutoTriggerCron } from "./cron/autoTrigger";

const app = express();
const PORT = parseInt(process.env.PORT ?? "5000", 10);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "phoeraksha-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/policy", policyRoutes);
app.use("/api/payout", payoutRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/trigger", triggerRoutes);
app.use("/api/demo", mockRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/mock", mockRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, () => {
  console.log(`Phoeraksha API listening on http://localhost:${PORT}`);
  try {
    startAutoTriggerCron();
  } catch (e) {
    console.error("Failed to start cron", e);
  }
});
