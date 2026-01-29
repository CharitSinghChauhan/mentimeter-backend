import { Router } from "express";
import {
  createQuizController,
  deleteQuizController,
  getAllQuestionOfQuizController,
  getAllQuizesOfUserController,
} from "../controllers/quiz-crud";
import {
  addQuestionToQuizController,
  makeQuizLiveController,
  quizStatusController,
  startQuizController,
} from "../controllers/quiz-lifecycle";
import {
  checkUserQuizController,
  getSessionCodeController,
} from "../controllers/quiz-session";

const router = Router();

router.post("/create-quiz", createQuizController);
router.get("/all-quizes", getAllQuizesOfUserController);
router.post("/add-question/:quizId", addQuestionToQuizController);
router.post("/get-questions", getAllQuestionOfQuizController);
router.post("/make-quiz-live/:quizId", makeQuizLiveController);
router.post("/start-quiz/:quizId", startQuizController);
router.post("/session-code", getSessionCodeController);
router.post("/quiz-status", quizStatusController);
router.get("/verify-owner/:sessionCode", checkUserQuizController);
router.post("/delete/:quizId", deleteQuizController);

export default router;
