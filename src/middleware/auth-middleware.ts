import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth";
import ErrorResponse from "../utils/error-response";

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
  next: NextFunction
) => {
  const userId = (await auth.api.getSession())?.user.id;

  if (!userId) throw new ErrorResponse(401, "Unauthorized");

  req.userId = userId;
  next();
};

export default authMiddleware;
