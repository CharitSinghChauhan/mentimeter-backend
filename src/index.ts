import app from "./app";
import prisma from "./lib/prisma";
import http from "http";
const server = http.createServer(app);
import { Server } from "socket.io";
import establishWsConnection from "./ws/ws";

const PORT = 8000;

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

(async () => {
  try {
    await prisma.$connect();
    establishWsConnection();
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
})();

export default io;
