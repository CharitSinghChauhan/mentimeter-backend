import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth";
import ErrorResponse from "../utils/error-response";
import { fromNodeHeaders } from "better-auth/node";

declare global {
  namespace Express {
    export interface Request {
      userId: string;
    }
  }
}

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log("📥 Incoming cookies:", req.headers.cookie);
  console.log("📥 All headers:", req.headers);

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  console.log("📥 Session result:", session);

  const userId = session?.user.id;

  if (!userId) throw new ErrorResponse(401, "Unauthorized");

  req.userId = userId;
  next();
};

export default authMiddleware;
