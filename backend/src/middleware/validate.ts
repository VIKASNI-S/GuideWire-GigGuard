import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

export function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
      return;
    }
    (req as Request & { validatedBody: T }).validatedBody = parsed.data;
    next();
  };
}
