import type { Request, Response } from "express";
import { createQuizSchema, questionArraySchema } from "../zod/zod-schema";
import ErrorResponse from "../utils/error-response";
import prisma from "../lib/prisma";
import apiResponse from "../utils/api-response";
import { redis } from "bun";
import REDIS_KEYS from "../ws/utils/redis-keys";
import io from "..";
import { nanoid } from "nanoid";

export const createQuizController = async (req: Request, res: Response) => {
  const zodResponse = createQuizSchema.safeParse(req.body);

  if (!zodResponse.success)
    throw new ErrorResponse(422, "create quiz validate error");

  const isQuizTitleExist = await prisma.quiz.findFirst({
    where: {
      title: zodResponse.data.title,
    },
  });

  // TODO : not MVP : suggestion when typing and checking is title is unique
  if (isQuizTitleExist) throw new ErrorResponse(409, "Title should be quiz");

  const quiztitle = await prisma.quiz.create({
    data: {
      title: zodResponse.data.title,
      createdById: req.userId,
      status: "CREATED",
    },
    select: {
      title: true,
      status: true,
    },
  });

  return apiResponse(res, 201, "quiz created successfully", quiztitle);
};

export const getAllQuizesOfUser = async (req: Request, res: Response) => {
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
    },
  });

  // TODO : if all array is empty
  return apiResponse(res, 200, "all quizes", { allQuizes });
};

export const addQuestionToQuiz = async (req: Request, res: Response) => {
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

  await prisma.$transaction(
    zodResponse.data.questions.map((data, index) =>
      prisma.question.create({
        data: {
          quizId,
          type: "MCQ",
          text: data.question,
          options: data.options,
          correctOptionIndex: data.correctAnsIndex - 1,
          timeLimit: data.timeLimit,
          points: data.points,
          // TODO : what if there already questions
          orderIndex: index,
        },
      }),
    ),
  );

  return apiResponse(res, 201, "question add successfully", null);
};

// TODO : return all the question of the quizes

export const makeQuizLive = async (req: Request, res: Response) => {
  const quizId = req.params.quizId;

  if (!quizId) throw new ErrorResponse(400, "Quiz ID is required");

  const isQuizExist = await prisma.quiz.findUnique({
    where: {
      id: quizId,
      createdById: req.userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!isQuizExist) throw new ErrorResponse(404, "quiz does not exist");

  await prisma.quiz.update({
    where: {
      id: quizId,
      createdById: req.userId,
    },
    data: {
      status: "LIVE",
    },
    select: {},
  });

  // store in user localStorage

  const sessionCode = nanoid(6);

  // TODO : when session expires delete it

  await redis.set(REDIS_KEYS.SessionCode(quizId), sessionCode);

  await redis.hset(REDIS_KEYS.CurrentQuiz(sessionCode), {
    quizId: quizId,
    status: "LIVE",
  });

  return apiResponse(res, 204, "quiz is now live", { sessionCode });
};

export const startQuiz = async (req: Request, res: Response) => {
  const quizId = req.params.quizId;

  if (!quizId) throw new ErrorResponse(400, "Quiz ID is required");

  const isQuizExist = await prisma.quiz.findUnique({
    where: {
      id: quizId,
    },
    select: {
      status: true,
    },
  });

  if (!isQuizExist) throw new ErrorResponse(404, "quiz does not exist");

  if (isQuizExist.status === "LIVE")
    throw new ErrorResponse(409, "quiz is already live");

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
      text: true,
      options: true,
      timeLimit: true,
      points: true,
      correctOptionIndex: true,
      orderIndex: true,
    },
  });

  const sessionCode = await redis.get(REDIS_KEYS.SessionCode(quizId));

  if (!sessionCode) throw new ErrorResponse(404, "session does not exit");

  await redis.hset(REDIS_KEYS.CurrentQuiz(sessionCode), "status", "STARTED");

  for (const q of quizQuestions)
    await redis.rpush(REDIS_KEYS.Question(sessionCode), JSON.stringify(q));

  io.to(`${sessionCode}`).emit("quiz-started", { quizId });

  return apiResponse(res, 200, "Quiz is live", null);
};
