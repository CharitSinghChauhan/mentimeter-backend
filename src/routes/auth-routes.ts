import { Router } from "express";
import type { Request, Response } from "express";
import {
  signInWithGoogleIdToken,
  getSessionFromToken,
  deleteSession,
  COOKIE,
} from "../lib/auth";

const router = Router();

// GET /api/auth/google/client-id — expose public Google OAuth client ID
router.get("/google/client-id", (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res
      .status(500)
      .json({ success: false, message: "Google client id is not configured" });
  }

  return res.status(200).json({ success: true, clientId });
});

// POST /api/auth/google — sign in with Google ID token
router.post("/google", async (req: Request, res: Response) => {
  const idToken =
    typeof req.body?.idToken === "string" ? req.body.idToken : undefined;

  if (!idToken) {
    return res.status(400).json({ success: false, message: "idToken missing" });
  }

  try {
    const { token, user } = await signInWithGoogleIdToken(idToken);

    res.cookie(COOKIE.name, token, COOKIE.options);
    return res.status(200).json({ success: true, user });
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Google sign-in failed" });
  }
});

// GET /api/auth/get-session — returns the current user (used by middleware + client)
router.get("/get-session", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE.name];
  const session = await getSessionFromToken(token);
  if (!session) return res.status(200).json(null);
  return res.status(200).json(session);
});

// POST /api/auth/logout — clear session
router.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE.name];
  if (token) await deleteSession(token);
  res.clearCookie(COOKIE.name, {
    path: "/",
    httpOnly: true,
    sameSite: COOKIE.options.sameSite,
    secure: COOKIE.options.secure,
  });
  return res.status(200).json({ ok: true });
});

export default router;
