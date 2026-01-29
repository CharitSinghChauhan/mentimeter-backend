import type { Request, Response } from "express";
import ErrorResponse from "../utils/error-response";
import { redis } from "bun";
import REDIS_KEYS from "../ws/utils/redis-keys";
import apiResponse from "../utils/api-response";
import prisma from "../lib/prisma";

export const getSessionCodeController = async (req: Request, res: Response) => {
  const { quizId } = req.body;

  if (!quizId) throw new ErrorResponse(404, "quizId is missing");

  const sessionCode = await redis.get(REDIS_KEYS.SessionCode(quizId));

  console.log(sessionCode);

  if (!sessionCode) throw new ErrorResponse(404, "session code missing ");

  return apiResponse(res, 200, "session code", {
    sessionCode,
  });
};

export const checkUserQuizController = async (req: Request, res: Response) => {
  const { sessionCode } = req.params;

  if (!sessionCode) throw new ErrorResponse(400, "sessionCode is required");

  const quizData = await redis.hgetall(REDIS_KEYS.CurrentQuiz(sessionCode));

  if (!quizData || !quizData?.quizId) {
    return apiResponse(res, 200, "Session check", { isOwner: false });
  }

  const isQuizExist = await prisma.quiz.findFirst({
    where: {
      id: quizData.quizId,
      createdById: req.userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!isQuizExist) throw new ErrorResponse(404, "quiz does not exist");

  return apiResponse(res, 200, "Quiz belongs to user", {
    isOwner: !!isQuizExist,
  });
};
