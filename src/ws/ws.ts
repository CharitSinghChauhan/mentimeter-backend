import { redis } from "bun";
import io from "../index";
import QuizClass from "./quiz-class";
import { sessionCheck } from "./utils/checks";
import { wsFailedResponse, wsSuccessResponse } from "./ws-response";
import REDIS_KEYS from "./utils/redis-keys";
import { nanoid } from "nanoid";

const rooms = new Map<string, QuizClass>();
// TODO : Add validation of what ?? i think of nickname and sessionCode

let count = 0;

const establishWsConnection = () => {
  io.on("connection", (socket) => {
    // @EVENT :: user joins the quiz and add to room

    console.log(`${count++}:${socket.id}`);

    socket.on("user-join-quiz", async (data, callback) => {
      try {
        const { sessionCode, nickname } = data;

        // TODO : Check for nickname
        const sessionCheckResponse = await sessionCheck(sessionCode, "LIVE");

        if (!sessionCheckResponse?.success) callback(sessionCheckResponse);

        socket.join(`${sessionCode}`);

        // store in local storage
        // TODO :: reconnect logic add
        socket.data.nickname = nickname;
        socket.data.sessionCode = sessionCode;
        socket.data.id = nanoid(10);

        await redis.zadd(
          REDIS_KEYS.Leaderboard(sessionCode),
          0,
          `${socket.data.id}`,
        );

        // @Event :: send the notification
        socket.to(`${sessionCode}`).emit(
          "user-joined-notification",
          wsSuccessResponse("user-joined", {
            nickname,
            userId: socket.data.id,
          }),
        );

        callback(wsSuccessResponse("user successfully joined the quiz", null));
      } catch (error) {
        // TODO : Check to send the error messages
        wsFailedResponse("Failed to join the quiz", null);
      }
    });

    // @EVENT
    socket.on("get-all-quiz-user", async (data, callback) => {
      const { sessionCode } = data;

      const sessionCheckResponse = await sessionCheck(sessionCode, "LIVE");

      if (!sessionCheckResponse?.success) callback(sessionCheckResponse);

      const allUser = await io.in(`${sessionCode}`).fetchSockets();

      const userNickname = allUser.map((socket) => socket.data.nickname);

      // TODO : only send the socket data
      callback(
        wsSuccessResponse("all users in quiz", {
          userNickname,
        }),
      );
    });

    // @EVENT
    socket.on("user-score", async (data, callback) => {
      const { sessionCode } = data;

      const sessionCheckResponse = await sessionCheck(sessionCode, "STARTED");

      if (!sessionCheckResponse.success) callback(sessionCheckResponse);

      const userScore = await redis.zscore(
        REDIS_KEYS.Leaderboard(sessionCode),
        `${socket.data.id}`,
      );

      callback(
        "user-score",
        wsSuccessResponse("user-score", {
          userScore,
          nickname: socket.data.nickanme,
        }),
      );
    });

    // @Event
    socket.on("answer-submit", async (data, callback) => {
      const ansTime = Date.now();

      const { sessionCode, ansIndex, qId } = data;
      const sessionCheckResponse = await sessionCheck(sessionCode, "STARTED");
      if (!sessionCheckResponse.success) callback(sessionCheckResponse);

      const checkAnsResponse = await rooms
        .get(sessionCode)
        ?.checkAnswer(socket, qId, ansTime, ansIndex);

      console.log("checkAnsResponse", checkAnsResponse);
      callback(checkAnsResponse);
    });
  });
};

export const startedTheQuiz = async (quizId: string, sessionCode: string) => {
  rooms.set(sessionCode!, new QuizClass(sessionCode!, io, quizId));

  setTimeout(() => {
    console.log("quiz start");
    rooms.get(sessionCode!)?.start();
  }, 5000);
};

export default establishWsConnection;
