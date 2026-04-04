import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  fetchMlFeatureImportance,
  triggerMlRetrain,
} from "../services/mlService";

const router = Router();
router.use(authMiddleware);

router.get("/feature-importance", async (_req: Request, res: Response) => {
  const data = await fetchMlFeatureImportance();
  if (!data) {
    res.status(502).json({ error: "ML service unavailable" });
    return;
  }
  res.json(data);
});

router.post("/retrain", async (_req: Request, res: Response) => {
  const result = await triggerMlRetrain();
  if (!result) {
    res.status(502).json({ error: "ML retrain failed or service unavailable" });
    return;
  }
  res.json({
    ok: true,
    mean_r2: result.mean_r2,
    std_r2: result.std_r2,
    cv_scores: result.cv_scores,
  });
});

export default router;
