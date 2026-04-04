import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { PhoerakshaJwtPayload } from "../types/express";

const COOKIE = "pheraksha_token";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  const token = req.cookies?.[COOKIE] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as PhoerakshaJwtPayload;
    req.userId = decoded.sub;
    req.userEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export const AUTH_COOKIE_NAME = COOKIE;
