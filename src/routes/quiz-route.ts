import { Router } from "express";
import { createQuizController } from "../controllers/quiz-controller";
import authMiddleware from "../middleware/auth-middleware";

const router = Router();

router.post("create-quiz", authMiddleware, createQuizController);

export default router;
