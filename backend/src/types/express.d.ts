import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      adminId?: string;
      adminEmail?: string;
      adminRole?: string;
    }
  }
}

export interface PhoerakshaJwtPayload extends JwtPayload {
  sub: string;
  email: string;
}
