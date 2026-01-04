const REDIS_KEYS = {
  SessionCode: (quizId: string) => `quiz_id:${quizId}`,
  CurrentQuiz: (sessionCode: string) => `session:${sessionCode}`,
  Question: (SessionCode: string) => `questions:${SessionCode}`,
  Leaderboard: (sessionCode: string) => `leaderboder${sessionCode}`,
};

export default REDIS_KEYS;
