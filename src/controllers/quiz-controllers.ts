import type { Request, Response } from "express";
import { createQuizSchema, questionArraySchema } from "../zod/zod-schema";
import ErrorResponse from "../utils/error-response";
import prisma from "../lib/prisma";
import apiResponse from "../utils/api-response";
import { redis } from "bun";
import REDIS_KEYS from "../ws/utils/redis-keys";
import io from "..";
import { nanoid } from "nanoid";
import { wsSuccessResponse } from "../ws/ws-response";
import { startedTheQuiz } from "../ws/ws";

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
      id: true,
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
          correctOptionIndex: data.correctAnsIndex,
          timeLimit: data.timeLimit,
          points: data.points,
          // TODO : what if there already questions
          orderIndex: index,
        },
      }),
    ),
  );

  await prisma.quiz.update({
    where: {
      id: quizId,
      createdById: req.userId,
    },
    data: {
      status: "LIVE",
    },
  });

  // store in user localStorage

  let sessionCode = await redis.get(REDIS_KEYS.SessionCode(quizId));

  if (!sessionCode) {
    sessionCode = nanoid(6);
    // TODO : when session expires delete it
    await redis.set(REDIS_KEYS.SessionCode(quizId), sessionCode);

    await redis.hset(REDIS_KEYS.CurrentQuiz(sessionCode), {
      quizId: quizId,
      status: "LIVE",
    });
  }

  return apiResponse(res, 200, "quiz is now live", { sessionCode });
};

// TODO : return all the question of the quizes

export const startQuiz = async (req: Request, res: Response) => {
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

  io.to(`${sessionCode}`).emit(
    "quiz-started",
    wsSuccessResponse("quiz-started", {
      quizId,
    }),
  );

  startedTheQuiz(quizId, sessionCode);

  return apiResponse(res, 200, "Quiz is Started", null);
};

export const quizStatus = async (req: Request, res: Response) => {
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

export const getSessionCode = async (req: Request, res: Response) => {
  const { quizId } = req.body;

  if (!quizId) throw new ErrorResponse(404, "quizId is missing");

  const sessionCode = await redis.get(REDIS_KEYS.SessionCode(quizId));

  console.log(sessionCode);

  if (!sessionCode) throw new ErrorResponse(404, "session code missing ");

  return apiResponse(res, 200, "session code", {
    sessionCode,
  });
};

// TODO : change the name
// TODO : READ the code base
export const checkUserQuiz = async (req: Request, res: Response) => {
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

export const deleteQuiz = async (req: Request, res: Response) => {
  const { quizId } = req.params;

  if (!quizId) throw new ErrorResponse(400, "Quiz ID is required");

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      createdById: req.userId,
    },
  });

  if (!quiz) throw new ErrorResponse(404, "Quiz not found");

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
