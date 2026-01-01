import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import { auth } from "./lib/auth";
import quizRouter from "./routes/quiz-routes";
import errorMiddleware from "./middleware/error-middleware";
import express from "express";
import authMiddleware from "./middleware/auth-middleware";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

app.use("/api/v1/quiz", authMiddleware, quizRouter);
// app.use("/api/v1/session", quizSessionRouter);

app.use(errorMiddleware);

export default app;
