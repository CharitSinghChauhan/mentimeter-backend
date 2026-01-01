import app from "./app";
import prisma from "./lib/prisma";
import http from "http";
const server = http.createServer(app);
import { Server } from "socket.io";

const PORT = 8000;

export const io = new Server(server);

(async () => {
  try {
    await prisma.$connect();
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
})();
