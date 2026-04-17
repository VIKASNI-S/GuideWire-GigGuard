import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type AdminToken = {
  sub: string;
  email: string;
  role: string;
  type: "admin";
  exp: number;
};

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Missing admin token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as AdminToken;
    if (decoded.type !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    req.adminId = decoded.sub;
    req.adminEmail = decoded.email;
    req.adminRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid admin token" });
  }
}
