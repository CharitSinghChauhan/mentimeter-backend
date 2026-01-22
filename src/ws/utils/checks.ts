import { redis } from "bun";
import { wsFailedResponse, wsSuccessResponse } from "../ws-response";
import REDIS_KEYS from "./redis-keys";

export const sessionCheck = async (sessionCode: string | null, status: string) => {
  if (!sessionCode) return wsFailedResponse("sessionCode", null);

  const isSessionExist = await redis.hgetall(
    REDIS_KEYS.CurrentQuiz(sessionCode),
  );
  
  if (!isSessionExist) return wsFailedResponse("wrong session error", null);

  if (isSessionExist.status !== status)
    return wsFailedResponse(`Quiz is not ${status} yet`, null);

  return wsSuccessResponse("ok", null);
};
