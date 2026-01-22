import type { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/error-response";

const errorMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let message = "Error Ocurred";

  if (error instanceof ErrorResponse) {
    message = error.message;
  }

  console.log(error);

  res.status(error.statusCode ?? 500).json({
    success: false,
    message: message,
  });
};

export default errorMiddleware;
