import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import { auth } from "./lib/auth";
import quizRouter from "./routes/quiz-routes";
import errorMiddleware from "./middleware/error-middleware";
import express from "express";
import authMiddleware from "./middleware/auth-middleware";
import cookieParser from "cookie-parser";

const app = express();

// Trust proxy - REQUIRED for production (Render, Vercel, etc.)
// Without this, secure cookies won't work behind proxies


const origin = process.env.FRONTEND_URL!;

app.use(
  cors({
    origin: [
      origin,
      "http://localhost:3000",
      "https://live-quizzes.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(cookieParser());

app.set("trust proxy", 1);

app.get("/api/auth/callback/google", (req, res, next) => {
  console.log("==== CALLBACK HIT ====");
  console.log("State from Google:", req.query.state);
  console.log("Cookies received:", req.headers.cookie);
  next();
});

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use((req, res, next) => {
  console.log("Incoming Cookies:", req.headers.cookie);
  console.log("Parsed Cookies:", req.cookies);
  next();
});
app.use("/api/v1/quiz", authMiddleware, quizRouter);

app.use(errorMiddleware);

export default app;
