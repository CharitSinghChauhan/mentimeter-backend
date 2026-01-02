import { Router } from "express";
import {
  addQuestionToQuiz,
  createQuizController,
  getAllQuizesOfUser,
  makeQuizLive,
  startQuiz,
} from "../controllers/quiz-controllers";
import authMiddleware from "../middleware/auth-middleware";

const router = Router();

router.post("/create-quiz", createQuizController);
router.get("/all-quizes", getAllQuizesOfUser);
router.post("/add-question/:quizId", addQuestionToQuiz);
// TODO : get the all the question of the quiz with quizId
router.post("/live-quiz/:quizId",  makeQuizLive);
router.post("/start-quiz/:quizId", startQuiz);

export default router;
