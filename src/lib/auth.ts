/**
 * auth.ts — Google ID token verification + JWT session management
 *
 * No Better Auth. No Passport. No external auth libraries.
 *
 * Flow:
 *  1. Frontend Google popup returns an ID token
 *  2. POST /api/auth/google with { idToken }
 *  3. Verify token with Google → upsert user → create session
 *  4. Set HttpOnly cookie
 *  5. GET /api/auth/get-session returns user session
 */
import crypto from "crypto";
import prisma from "./prisma";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET ?? process.env.BETTER_AUTH_SECRET!;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = "app.session_token";
const IS_PROD = process.env.NODE_ENV === "production";

type SessionPayload = {
  sub: string;
  exp: number;
  iat: number;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  exp?: string;
};

function base64url(input: Buffer | string): string {
  const str = typeof input === "string" ? Buffer.from(input) : input;
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function signJWT(payload: SessionPayload): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const sig = base64url(
    crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(`${header}.${body}`)
      .digest(),
  );
  return `${header}.${body}.${sig}`;
}

function verifyJWT(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts as [string, string, string];
    const expected = base64url(
      crypto
        .createHmac("sha256", SESSION_SECRET)
      .update(`${header}.${body}`)
      .digest(),
    );
    if (sig !== expected) return null;
    const payload = JSON.parse(fromBase64url(body)) as SessionPayload;

    if (
      !payload ||
      typeof payload.sub !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (Date.now() / 1000 > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function verifyGoogleIdToken(idToken: string): Promise<{
  email: string;
  name: string;
  picture: string | null;
}> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!response.ok) throw new Error("Invalid Google ID token");

  const tokenInfo = (await response.json()) as GoogleTokenInfo;

  if (!tokenInfo.aud || tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Google token audience mismatch");
  }

  const issuer = tokenInfo.iss;
  if (
    issuer !== "https://accounts.google.com" &&
    issuer !== "accounts.google.com"
  ) {
    throw new Error("Google token issuer mismatch");
  }

  const exp = Number(tokenInfo.exp);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Google token expired");
  }

  const isVerifiedEmail =
    tokenInfo.email_verified === true || tokenInfo.email_verified === "true";
  if (!isVerifiedEmail || !tokenInfo.email) {
    throw new Error("Google email is not verified");
  }

  const fallbackName = tokenInfo.email.split("@")[0];
  return {
    email: tokenInfo.email,
    name: tokenInfo.name?.trim() || fallbackName,
    picture: tokenInfo.picture ?? null,
  };
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = signJWT({
    sub: userId,
    exp: Math.floor(expiresAt.getTime() / 1000),
    iat: Math.floor(Date.now() / 1000),
  });

  await prisma.session.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function signInWithGoogleIdToken(idToken: string): Promise<{
  token: string;
  user: SessionUser;
}> {
  const googleUser = await verifyGoogleIdToken(idToken);

  const user = await prisma.user.upsert({
    where: { email: googleUser.email },
    update: { name: googleUser.name, avatarUrl: googleUser.picture },
    create: {
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });

  const token = await createSession(user.id);
  return { token, user };
}

export async function getSessionFromToken(
  token: string | undefined,
): Promise<{ user: SessionUser } | null> {
  if (!token) return null;

  const payload = verifyJWT(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { token } });
    return null;
  }

  return { user: session.user };
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {});
}

export const COOKIE = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: (IS_PROD ? "none" : "lax") as const,
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  },
};
