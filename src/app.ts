import "dotenv/config";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth-routes";
import quizRouter from "./routes/quiz-routes";
import errorMiddleware from "./middleware/error-middleware";
import authMiddleware from "./middleware/auth-middleware";

const app = express();

// Trust proxy — required for secure cookies behind Render/Vercel proxies
app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.FRONTEND_URL!,
  "http://localhost:3000",
  "https://live-quizzes.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Auth routes — Google sign-in + session endpoints (public)
app.use("/api/auth", authRouter);

// Protected quiz routes
app.use("/api/v1/quiz", authMiddleware, quizRouter);

app.use(errorMiddleware);

export default app;
