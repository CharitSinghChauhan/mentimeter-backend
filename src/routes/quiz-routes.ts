import { Router } from "express";
import {
  addQuestionToQuiz,
  checkUserQuiz,
  createQuizController,
  deleteQuiz,
  getAllQuizesOfUser,
  getSessionCode,
  quizStatus,
  startQuiz,
} from "../controllers/quiz-controllers";
import authMiddleware from "../middleware/auth-middleware";

const router = Router();

router.post("/create-quiz", createQuizController);
router.get("/all-quizes", getAllQuizesOfUser);
router.post("/add-question/:quizId", addQuestionToQuiz);
// TODO : get the all the question of the quiz with quizId
router.post("/start-quiz/:quizId", startQuiz);
router.post("/session-code", getSessionCode);
router.post("/quiz-status", quizStatus);
router.get("/verify-owner/:sessionCode", checkUserQuiz)
router.post("/delete/:quizId", deleteQuiz)

export default router;
