import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import { auth } from "./lib/auth";
import quizRouter from "./routes/quiz-routes";
import errorMiddleware from "./middleware/error-middleware";
import express from "express";
import authMiddleware from "./middleware/auth-middleware";

const app = express();

const origin = process.env.FRONTEND_URL!;

app.use(
  cors({
    origin: [origin, "https://live-quizzes.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use("/api/v1/quiz", authMiddleware, quizRouter);

app.use(errorMiddleware);

export default app;
