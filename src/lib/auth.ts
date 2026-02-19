import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

export const origin = process.env.FRONTEND_URL!;
export const backendUrl = process.env.BETTER_AUTH_URL!;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: backendUrl,
  trustedOrigins: [origin, backendUrl],
  cookiePrefix: "better-auth",
  cookies: {
    sameSite: "none",
    secure: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: `${backendUrl}/api/auth/callback/google`,
    },
  },
});
