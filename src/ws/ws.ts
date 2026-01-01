import { redis } from "bun";
import { io } from "../index";
import { wsFailedResponse } from "./ws-response";

io.on("connection", (socket) => {
  socket.on("join-quiz-session", async (data, callback) => {
    const { sessionCode } = data;

    if (!sessionCode)
      return callback(wsFailedResponse("quiz code needed", null));

    const isSessionExist = await redis.exists(`session:${sessionCode}`);

    if (!isSessionExist)
      return callback(wsFailedResponse("quiz session doesn't exist", null));

    

  });
});
