import { toNodeHandler } from "better-auth/node";
import express from "express";
import { auth } from "./lib/auth";
import quizRouter from "./routes/quiz-route";
import errorMiddleware from "./middleware/error-middleware";

const app = express();

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use("/api/v1", quizRouter);

app.use(errorMiddleware)

export default app;
