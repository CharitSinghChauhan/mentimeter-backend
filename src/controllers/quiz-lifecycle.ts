import type { Request, Response } from "express";
import { questionArraySchema } from "../zod/zod-schema";
import ErrorResponse from "../utils/error-response";
import prisma from "../lib/prisma";
import { redis } from "bun";
import REDIS_KEYS from "../ws/utils/redis-keys";
import { nanoid } from "nanoid";
import apiResponse from "../utils/api-response";
import io from "..";
import { wsSuccessResponse } from "../ws/ws-response";
import { startedTheQuiz } from "../ws/ws";

export const addQuestionToQuizController = async (
  req: Request,
  res: Response,
) => {
  const zodResponse = questionArraySchema.safeParse(req.body);

  if (!zodResponse.success)
    throw new ErrorResponse(422, zodResponse.error.name);

  const quizId = req.params.quizId;

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

  zodResponse.data.questions.forEach((_, index) => {
    console.log(_, index);
  });

  await prisma.$transaction(
    zodResponse.data.questions.map((data, index) =>
      prisma.question.create({
        data: {
          quizId,
          type: "MCQ",
          question: data.question,
          options: data.options,
          correctOptionIndex: data.correctAnsIndex,
          timeLimit: data.timeLimit,
          points: data.points,
        },
      }),
    ),
  );

  await prisma.quiz.update({
    where: {
      id: quizId,
    },
    data: {
      status: "CREATED",
    },
  });

  apiResponse(res, 200, "question added", null);
};

export const makeQuizLiveController = async (req: Request, res: Response) => {
  const quizId = req.params.quizId;

  if (!quizId) throw new ErrorResponse(400, "Quiz ID is required");

  const isQuizExist = await prisma.quiz.findUnique({
    where: {
      id: quizId,
      createdById: req.userId,
    },
    select: {
      status: true,
    },
  });

  if (!isQuizExist) throw new ErrorResponse(404, "quiz does not exist");

  if (isQuizExist.status === "LIVE")
    throw new ErrorResponse(409, "quiz is live started");

  await prisma.quiz.update({
    where: {
      id: quizId,
    },
    data: {
      status: "LIVE",
    },
  });

  const sessionCode = nanoid(6);
  await redis.set(REDIS_KEYS.SessionCode(quizId), sessionCode);
  await redis.hset(REDIS_KEYS.CurrentQuiz(sessionCode), {
    quizId: quizId,
    status: "LIVE",
  });

  return apiResponse(res, 200, "quiz is now live", { sessionCode });
};

export const startQuizController = async (req: Request, res: Response) => {
  const quizId = req.params.quizId;

  if (!quizId) throw new ErrorResponse(400, "Quiz ID is required");

  const isQuizExist = await prisma.quiz.findUnique({
    where: {
      id: quizId,
      createdById: req.userId,
    },
    select: {
      status: true,
    },
  });

  if (!isQuizExist) throw new ErrorResponse(404, "quiz does not exist");

  if (isQuizExist.status === "STARTED")
    throw new ErrorResponse(409, "quiz is already started");

  await prisma.quiz.update({
    where: {
      id: quizId,
    },
    data: {
      status: "STARTED",
    },
  });

  const quizQuestions = await prisma.question.findMany({
    where: {
      quizId: quizId,
    },
    select: {
      id: true,
      question: true,
      options: true,
      timeLimit: true,
      points: true,
      correctOptionIndex: true,
    },
  });

  const sessionCode = await redis.get(REDIS_KEYS.SessionCode(quizId));

  if (!sessionCode) throw new ErrorResponse(404, "session does not exit");

  await redis.hset(REDIS_KEYS.CurrentQuiz(sessionCode), "status", "STARTED");

  for (const q of quizQuestions)
    await redis.rpush(REDIS_KEYS.Question(sessionCode), JSON.stringify(q));

  io.to(`${sessionCode}`).emit(
    "quiz-started",
    wsSuccessResponse("quiz-started", {
      quizId,
    }),
  );

  startedTheQuiz(quizId, sessionCode);

  return apiResponse(res, 200, "Quiz is Started", null);
};

export const quizStatusController = async (req: Request, res: Response) => {
  const { quizId } = req.body;

  const status = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      createdById: req.userId,
    },
    select: {
      status: true,
    },
  });

  return apiResponse(res, 200, "quiz status", {
    status,
  });
};
