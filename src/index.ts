import "dotenv/config";
import app from "./app";
import prisma from "./lib/prisma";
import http from "http";
import { Server } from "socket.io";
import establishWsConnection from "./ws/ws";

const PORT = 8000;

const server = http.createServer(app);

const origin = process.env.FRONTEND_URL!;

const io = new Server(server, {
  cors: {
    origin: origin,
  },
});

// TODO : server and app

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
