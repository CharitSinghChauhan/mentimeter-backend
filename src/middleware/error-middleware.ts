import type { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/error-response";

const errorMiddleware = (
  error: ErrorResponse,
  req: Request,
  res: Response,
  next: NextFunction
) => {

    
  res.status(error.statusCode ?? 500).json({
    success: false,
    message: error.message,
  });
};

export default errorMiddleware;
