import type { Request, Response } from "express";
import { createQuizzSchema, questionArraySchema } from "../zod/zod-schema";
import ErrorResponse from "../utils/error-response";
import prisma from "../lib/prisma";
import apiResponse from "../utils/api-response";

export const createQuizController = async (req: Request, res: Response) => {
  const zodResponse = createQuizzSchema.safeParse(req.body);

  if (!zodResponse.success)
    throw new ErrorResponse(422, zodResponse.error.name);

  const quizztitle = await prisma.quiz.create({
    data: {
      title: zodResponse.data.title,
      createdById: req.userId,
    },
    select: {
      title: true,
    },
  });

  return apiResponse(res, 201, "quiz created successfully", quizztitle);
};

export const addQuestionToQuizz = async (req: Request, res: Response) => {
  const zodResponse = questionArraySchema.safeParse(req.body);

  if (!zodResponse.success)
    throw new ErrorResponse(422, zodResponse.error.name);

  const quizId = req.params.id;

  if (!quizId) throw new ErrorResponse(400, "Quiz ID is required");

  await prisma.question.createMany({
    data: zodResponse.data.questions.map((q, index) => ({
      quizId,
      text: q.question,
      options: q.options,
      // TODO : correct on frontend - 1
      correctOptionIndex: q.correctAnsIndex,
      type: "multiple-choice",
      timeLimit: 60,
      orderIndex: index,
    })),
  });
};
