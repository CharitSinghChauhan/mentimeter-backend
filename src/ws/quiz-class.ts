import { redis } from "bun";
import { Socket, type Server } from "socket.io";
import REDIS_KEYS from "./utils/redis-keys";
import { wsFailedResponse, wsSuccessResponse } from "./ws-response";
import prisma from "../lib/prisma";

interface IQuestion {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  timeLimit: number;
  points: number;
  orderIndex: number;
}

class QuizClass {
  // Learn :: when to make private and when to make class
  private sessionCode: string;
  private io: Server;
  private quizId: string;

  // Learn :: why not make it private and no initializer error
  protected currentQuestion?: IQuestion;
  protected questionStartTime?: number;

  constructor(sessionCode: string, io: Server, quizId: string) {
    this.sessionCode = sessionCode;
    this.io = io;
    this.quizId = quizId;
  }

  start() {
    this.nextQuestion();
  }

  private async nextQuestion() {
    const q = await redis.lpop(REDIS_KEYS.Question(this.sessionCode));

    if (!q) {
      // fetch the top 10 and user score;
      await redis.del(REDIS_KEYS.Question(this.sessionCode));
      await redis.del(REDIS_KEYS.CurrentQuiz(this.sessionCode));
      await redis.del(REDIS_KEYS.SessionCode(this.quizId));
      // TODO : store in the database score of the quiz Top 10

      // TODO : end the quiz
      console.log("quiz ended");
      return this.io
        .to(this.sessionCode)
        .emit("quiz-end", wsSuccessResponse("quiz-end-result", null));
    }

    this.currentQuestion = JSON.parse(q!);
    this.questionStartTime = Date.now();

    this.io.to(this.sessionCode).emit(
      "question",
      wsSuccessResponse("question", {
        id: this.currentQuestion?.id,
        text: this.currentQuestion?.text,
        options: this.currentQuestion?.options,
        timeLimit: this.currentQuestion?.timeLimit,
        points: this.currentQuestion?.points,
      }),
    );

    // May cause the error
    setTimeout(async () => {
      await this.endQuestionAndShowResult();
    }, this.currentQuestion?.timeLimit! * 1000);
  }

  private async endQuestionAndShowResult() {
    const top10UsersWithScore = await redis.zrange(
      REDIS_KEYS.Leaderboard(this.sessionCode),
      0,
      9,
      "REV",
      "WITHSCORES",
    );

    console.log("top10UsersWithScore", top10UsersWithScore);

    this.io.to(this.sessionCode).emit(
      "top-10-users-with-score-and-name",
      wsSuccessResponse("top-10-users-with-score-and-name", {
        top10UsersWithScore,
      }),
    );

    await redis.del(REDIS_KEYS.AnsUsers(this.currentQuestion?.id!));
    await prisma.quiz.update({
      where: {
        id: this.quizId,
      },
      data: {
        status: "OVER",
      },
    });

    setTimeout(async () => {
      await this.nextQuestion();
    }, 5000);
  }

  async checkAnswer(
    socket: Socket,
    qId: string,
    ansTime: number,
    ansIndex: number,
  ) {
    const isUserExist = await redis.sismember(
      REDIS_KEYS.AnsUsers(this.currentQuestion?.id!),
      socket.id,
    );

    if (isUserExist) {
      return wsFailedResponse("already answered", null);
    } else if (qId !== this.currentQuestion?.id)
      return wsFailedResponse("question-expired", null);

    const remainingTime = ansTime - this.questionStartTime!;

    // Error ! :: TODO
    if (remainingTime > this.currentQuestion?.timeLimit! * 1000) {
      return wsFailedResponse("move to next question", null);
    }

    if (ansIndex === this.currentQuestion?.correctOptionIndex) {
      const score =
        this.currentQuestion.points +
        Math.floor(this.currentQuestion.points / remainingTime);

      console.log("score: ", score);

      await redis.zincrby(
        REDIS_KEYS.Leaderboard(this.sessionCode),
        score,
        `${socket.data.nickname}`,
      );

      await redis.sadd(REDIS_KEYS.AnsUsers(this.currentQuestion.id), socket.id);
    }

    return wsSuccessResponse("check-ans-response", {
      correctOptionIndex: this.currentQuestion?.correctOptionIndex,
    });
  }
}

export default QuizClass;
