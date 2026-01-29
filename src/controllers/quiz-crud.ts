import type { Request, Response } from "express";
import { createQuizSchema, questionArraySchema } from "../zod/zod-schema";
import ErrorResponse from "../utils/error-response";
import prisma from "../lib/prisma";
import apiResponse from "../utils/api-response";
import { redis } from "bun";
import REDIS_KEYS from "../ws/utils/redis-keys";

export const createQuizController = async (req: Request, res: Response) => {
  const zodResponse = createQuizSchema.safeParse(req.body);

  if (!zodResponse.success)
    throw new ErrorResponse(422, "create quiz validate error");

  const isQuizTitleExist = await prisma.quiz.findFirst({
    where: {
      title: zodResponse.data.title,
    },
  });

  if (isQuizTitleExist) throw new ErrorResponse(409, "Title should be quiz");

  const quiztitle = await prisma.quiz.create({
    data: {
      title: zodResponse.data.title,
      createdById: req.userId,
      status: "CREATED",
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  return apiResponse(res, 201, "quiz created successfully", quiztitle);
};

export const getAllQuizesOfUserController = async (
  req: Request,
  res: Response,
) => {
  const userId = req.userId;

  if (!userId) throw new ErrorResponse(401, "Unauthorized");

  const allQuizes = await prisma.quiz.findMany({
    where: {
      createdById: userId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  // TODO : if all array is empty
  return apiResponse(res, 200, "all quizes", allQuizes);
};

export const deleteQuizController = async (req: Request, res: Response) => {
  const { quizId } = req.params;

  if (!quizId) throw new ErrorResponse(400, "Quiz ID is required");

  const isQuizExist = await prisma.quiz.findUnique({
    where: {
      id: quizId,
    },
    select: {
      questions: true,
      id: true,
    },
  });

  if (!isQuizExist) throw new ErrorResponse(404, "quiz does not exist");

  const sessionCode = await redis.get(REDIS_KEYS.SessionCode(quizId));

  if (sessionCode) {
    await redis.del(REDIS_KEYS.SessionCode(quizId));
    await redis.del(REDIS_KEYS.CurrentQuiz(sessionCode));
    await redis.del(REDIS_KEYS.Question(sessionCode));
  }

  await prisma.quiz.delete({
    where: {
      id: quizId,
    },
  });

  return apiResponse(res, 200, "Quiz deleted successfully", null);
};

export const getAllQuestionOfQuizController = async (
  req: Request,
  res: Response,
) => {
  const { quizId } = req.body;

  if (!quizId) throw new ErrorResponse(400, "Quiz ID is required");

  const isQuizExist = await prisma.quiz.findUnique({
    where: {
      id: quizId,
    },
    select: {
      questions: true,
      id: true,
    },
  });

  if (!isQuizExist) throw new ErrorResponse(404, "quiz does not exist");

  const quizQ = await prisma.quiz.findUnique({
    where: {
      id: quizId,
      createdById: req.userId,
    },
    select: {
      questions: true,
    },
  });

  return apiResponse(res, 200, "question added", quizQ);
};
