import type { Response } from "express";

const apiResponse = <T>(
  res: Response,
  statusCode = 200,
  message: string,
  payload: T
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    payload,
  });
};

export default apiResponse;
