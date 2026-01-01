import { Router } from "express";
import {
  addQuestionToQuiz,
  createQuizController,
  getAllQuizes,
  makeQuizLive,
} from "../controllers/quiz-controllers";

const router = Router();

router.post("/create-quiz", createQuizController);
router.get("/all-quizes", getAllQuizes);
router.post("/add-question/:quizId", addQuestionToQuiz);
// TODO : get the all the question of the quiz with quizId
router.post("/live-quiz/:quizId", makeQuizLive);

export default router;
