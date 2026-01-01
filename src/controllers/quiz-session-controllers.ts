// import type { Request, Response } from "express";
// import ErrorResponse from "../utils/error-response";
// import { redis } from "bun";

// export const joinQuizSession = async (req: Request, res: Response) => {
//   const sessionCode = req.params.code;

//   if (!sessionCode) throw new ErrorResponse(400, "session code missing");

//   // validate the session

//   const isSessionExist = await redis.exists(`session:${sessionCode}`);

//   if(!isSessionExist) 
// };
