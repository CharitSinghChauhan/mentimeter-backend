import { redis } from "bun";
import { io } from "../index";
import { wsFailedResponse, wsSuccessResponse } from "./ws-response";

// TODO : check everywhere the question and quiz send or started only when it should
// do not trigger the event from the client side

const sessionCheck = async (sessionCode: string, status: string) => {
  if (!sessionCode) return wsFailedResponse("quiz code needed", null);

  const isSessionExist = await redis.hget(`session:${sessionCode}`, "status");

  if (!isSessionExist || isSessionExist !== status)
    return wsFailedResponse(
      "session doesn't exit or quiz is not ready yet",
      null
    );

  return wsSuccessResponse("sessionCheck successfully", null);
};

const establisWsConnection = () => {
  io.on("connection", (socket) => {
    console.log("user-enter");

    // EVENT join-quiz-session
    socket.on("join-quiz-session", async (data, callback) => {
      // add the zod validation
      try {
        const { sessionCode, nickname } = data;

        const sessionCheckResponse = await sessionCheck(sessionCode, "live");

        if (!sessionCheckResponse.success)
          return callback(sessionCheckResponse);

        // EVENT - join-room
        socket.join(`${sessionCode}`);

        socket.data.nickname = nickname || socket.id;
        socket.data.sessionCode = sessionCode;

        // EVENT user-joined-room
        socket.to(`${sessionCode}`).emit(
          "user-joined-room",
          wsSuccessResponse("user-joined-room", {
            id: socket.id,
            nickname: socket.data.nickname,
          })
        );

        return callback(
          wsSuccessResponse("successfully joined the quiz", null)
        );
      } catch (error) {
        console.error("join-quiz-session error:");
        return callback(wsFailedResponse("internal error", null));
      }
    });

    // EVENT
    socket.to(`${socket.data.sessionCode}`).emit(
      "all-users",
      wsSuccessResponse("all-users", {
        users: io.in(`${socket.data.sessionCode}`).fetchSockets(),
      })
    );

    // EVENT
    socket.on("quiz-started-notify-participations", async (data, callback) => {
      const { sessionCode } = data;

      const sessionCheckResponse = await sessionCheck(sessionCode, "started");

      if (!sessionCheckResponse.success) return callback(sessionCheckResponse);

      // EVENT
      socket.to(`${sessionCode}`).emit(
        "quiz-started-notification",
        wsSuccessResponse("quiz-started", {
          quizStatusStarted: true,
        })
      );

      const questionJson = await redis.lpop(`questions${sessionCode}`);

      // TODO : if the no question
    });

    //   // EVENT
    //   socket.on("get-question", async (data, callback) => {
    //     const { sessionCode } = data;

    //     // how to check if the question have to send or not

    //     const sessionCheckResponse = await sessionCheck(sessionCode, "live");

    //     if (!sessionCheckResponse.success) return sessionCheckResponse;

    //     // TODO : should send reponse to
    //     if (!questionJson) wsSuccessResponse("no question left", null);

    //     const;

    //     return callback(wsSuccessResponse("question", questionJson));
    //   });
  });
};

export default establisWsConnection;
