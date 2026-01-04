import { redis } from "bun";
import { Socket, type Server } from "socket.io";
import REDIS_KEYS from "./utils/redis-keys";
import { wsFailedResponse, wsSuccessResponse } from "./ws-response";

interface IQuestion {
  id: string;
  text: string;
  options: string[];
  ansIndex: number;
  timeLimit: number;
  points: number;
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
    this.nextQuestion;
  }

  private async nextQuestion() {
    const q = await redis.lpop(REDIS_KEYS.Question(this.sessionCode));

    if (!q) {
      // fetch the top 10 and user score;
      return this.io
        .to(this.sessionCode)
        .emit("quiz-end-result", wsSuccessResponse("quiz-end-result", null));
    }

    this.currentQuestion = JSON.parse(q);
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
    }, this.questionStartTime);
  }

  private async endQuestionAndShowResult() {
    const top10UsersWithScore = await redis.zrevrangebyscore(
      REDIS_KEYS.Leaderboard(this.sessionCode),
      0,
      9,
      "WITHSCORES",
    );

    this.io.to(this.sessionCode).emit(
      "top-10-users-with-score-and-name",
      wsSuccessResponse("top-10-users-with-score-and-name", {
        top10UsersWithScore,
      }),
    );

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
    if (qId !== this.currentQuestion?.id)
      return wsFailedResponse("question-expired", null);

    const remainingTime = ansTime - this.questionStartTime!;

    // Error ! ::
    if (remainingTime > this.currentQuestion?.timeLimit!) {
      return wsFailedResponse("move to next question", null);
    }

    if (ansIndex === this.currentQuestion?.ansIndex) {
      const score =
        this.currentQuestion.points +
        Math.floor(this.currentQuestion.points / remainingTime);

      await redis.zincrby(
        REDIS_KEYS.Leaderboard(this.sessionCode),
        score,
        `${socket.data.id}`,
      );
      // TODO : show the options choosen by other user
    }
    return wsSuccessResponse("check-ans-response", {
      ansIndex: this.currentQuestion?.ansIndex,
    });
  }
}

export default QuizClass;
