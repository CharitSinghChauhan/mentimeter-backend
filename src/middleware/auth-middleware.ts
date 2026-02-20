import type { NextFunction, Request, Response } from "express";
import { getSessionFromToken, COOKIE } from "../lib/auth";
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
  _res: Response,
  next: NextFunction,
) => {
  const token = req.cookies?.[COOKIE.name];
  const session = await getSessionFromToken(token);

  if (!session?.user?.id) throw new ErrorResponse(401, "Unauthorized");

  req.userId = session.user.id;
  next();
};

export default authMiddleware;
